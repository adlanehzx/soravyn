import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  approvals,
  campaigns,
  campaignCopy,
  videoJobs,
  type Db,
} from "@soravyn/db";
import { join } from "node:path";
import { z } from "zod";
import { assertBoard, assertCompanyAccess } from "./authz.js";
import { videoRoot } from "../services/video-contract.js";
import { notFound } from "../errors.js";
export function clientDeliveryRoutes(db: Db) {
  const router = Router();
  const base = "/companies/:companyId/client-deliverables";
  router.use(base, (req, _res, next) => {
    assertBoard(req);
    assertCompanyAccess(req, z.string().uuid().parse(req.params.companyId));
    next();
  });
  router.get(base, async (req, res) => {
    const companyId = req.params.companyId as string;
    const videos = await db
      .select({
        id: videoJobs.id,
        campaignName: campaigns.name,
        createdAt: videoJobs.createdAt,
        input: videoJobs.input,
      })
      .from(videoJobs)
      .innerJoin(
        campaigns,
        and(
          eq(videoJobs.campaignId, campaigns.id),
          eq(campaigns.companyId, companyId)
        )
      )
      .innerJoin(
        approvals,
        and(
          eq(videoJobs.approvalId, approvals.id),
          eq(approvals.companyId, companyId),
          eq(approvals.status, "approved")
        )
      )
      .where(
        and(
          eq(videoJobs.companyId, companyId),
          eq(videoJobs.status, "succeeded")
        )
      )
      .orderBy(desc(videoJobs.createdAt))
      .limit(100);
    const texts = await db
      .select({
        id: campaignCopy.id,
        title: campaignCopy.title,
        body: campaignCopy.body,
        channel: campaignCopy.channel,
      })
      .from(campaignCopy)
      .where(
        and(
          eq(campaignCopy.companyId, companyId),
          eq(campaignCopy.status, "approved")
        )
      )
      .orderBy(desc(campaignCopy.createdAt))
      .limit(200);
    res.json({
      videos: videos.map(({ input, ...row }) => ({
        ...row,
        platform: input.platform,
      })),
      texts,
    });
  });
  router.get(`${base}/:jobId/video`, async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = z.string().uuid().parse(req.params.jobId);
    const [job] = await db
      .select({ id: videoJobs.id })
      .from(videoJobs)
      .innerJoin(
        approvals,
        and(
          eq(videoJobs.approvalId, approvals.id),
          eq(approvals.companyId, companyId),
          eq(approvals.status, "approved")
        )
      )
      .where(
        and(
          eq(videoJobs.id, id),
          eq(videoJobs.companyId, companyId),
          eq(videoJobs.status, "succeeded")
        )
      );
    if (!job) throw notFound("Approved deliverable not found");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    res.sendFile(join(videoRoot(), companyId, id, "output.mp4"), {
      dotfiles: "allow",
    });
  });
  return router;
}
