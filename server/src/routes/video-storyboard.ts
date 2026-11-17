import { Router } from "express";
import { and, desc, eq, inArray, like, or } from "drizzle-orm";
import {
  type Db,
  campaigns,
  marketingPlanProposals,
  editorialCalendarItems,
  videoJobs,
} from "@soravyn/db";
import { generateStoryboardInputSchema } from "@soravyn/shared";
import { validate } from "../middleware/validate.js";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";
import { logActivity } from "../services/activity-log.js";
import {
  generateStoryboard,
  enqueueVideoProductionFromStoryboard,
} from "../services/storyboard-generator.js";
import { notFound, unprocessable } from "../errors.js";

export function videoStoryboardRoutes(db: Db) {
  const router = Router();
  const base = "/companies/:companyId/studio/video";

  router.use(base, (req, _res, next) => {
    assertCompanyAccess(req, req.params.companyId as string);
    assertBoard(req);
    next();
  });

  // 1. Preview generated storyboard without enqueueing
  router.post(
    `${base}/preview-storyboard`,
    validate(generateStoryboardInputSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const storyboard = await generateStoryboard(db, companyId, req.body);
      res.json({ storyboard });
    }
  );

  // 2. Generate and enqueue full video production
  router.post(
    `${base}/generate-from-proposal`,
    validate(generateStoryboardInputSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const storyboard = await generateStoryboard(db, companyId, req.body);

      // Resolve or create campaign
      let campaignId = req.body.campaignId;
      if (!campaignId && req.body.proposalId) {
        const [p] = await db
          .select({ campaignId: marketingPlanProposals.campaignId })
          .from(marketingPlanProposals)
          .where(
            and(
              eq(marketingPlanProposals.id, req.body.proposalId),
              eq(marketingPlanProposals.companyId, companyId)
            )
          );
        if (p?.campaignId) campaignId = p.campaignId;
      }

      if (!campaignId && req.body.calendarItemId) {
        const [cItem] = await db
          .select({ campaignId: editorialCalendarItems.campaignId })
          .from(editorialCalendarItems)
          .where(
            and(
              eq(editorialCalendarItems.id, req.body.calendarItemId),
              eq(editorialCalendarItems.companyId, companyId)
            )
          );
        if (cItem?.campaignId) campaignId = cItem.campaignId;
      }

      if (!campaignId) {
        // Find existing recent campaign or create a default studio campaign
        const [existing] = await db
          .select({ id: campaigns.id })
          .from(campaigns)
          .where(eq(campaigns.companyId, companyId))
          .orderBy(desc(campaigns.createdAt))
          .limit(1);

        if (existing) {
          campaignId = existing.id;
        } else {
          const [created] = await db
            .insert(campaigns)
            .values({
              companyId,
              name: `Campagne Vidéo : ${storyboard.title.slice(0, 50)}`,
              status: "production",
              brief: "Génération automatique d'actif vidéo via Storyboard IA SORAVYN.",
              objectives: "Visibilité et conversion omnicanale.",
            })
            .returning();
          campaignId = created.id;
        }
      }

      const job = await enqueueVideoProductionFromStoryboard(db, companyId, storyboard, {
        campaignId,
        proposalId: req.body.proposalId,
        calendarItemId: req.body.calendarItemId,
      });

      await logActivity(db, {
        companyId,
        ...getActorInfo(req),
        action: "video.storyboard_generated",
        entityType: "video_job",
        entityId: job.id,
        details: {
          platform: storyboard.platform,
          template: storyboard.template,
          duration: storyboard.totalDuration,
          proposalId: req.body.proposalId,
          calendarItemId: req.body.calendarItemId,
        },
      });

      res.status(201).json({
        storyboard,
        job,
        calendarItemId: req.body.calendarItemId,
        message: "Storyboard synthétisé et production vidéo mise en file avec succès.",
      });
    }
  );

  // 3. List video-ready proposals from Marketing Plans
  router.get(`${base}/proposals`, async (req, res) => {
    const companyId = req.params.companyId as string;
    const rows = await db
      .select()
      .from(marketingPlanProposals)
      .where(
        and(
          eq(marketingPlanProposals.companyId, companyId),
          or(
            like(marketingPlanProposals.format, "%Video%"),
            like(marketingPlanProposals.format, "%Short%"),
            like(marketingPlanProposals.format, "%Reels%"),
            inArray(marketingPlanProposals.channel, ["YouTube", "TikTok", "Instagram"])
          )
        )
      )
      .orderBy(desc(marketingPlanProposals.createdAt))
      .limit(50);

    res.json(rows);
  });

  return router;
}
