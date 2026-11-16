import { Router } from "express";
import { and, eq, desc } from "drizzle-orm";
import { flowJobs, campaigns, type Db } from "@soravyn/db";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { assertWorkspaceAdmin } from "./governance.js";
import { getActorInfo } from "./authz.js";
import { validate } from "../middleware/validate.js";
import {
  flowRequest,
  flowRecipe,
  flowDirectory,
} from "../services/flow-contract.js";
import { conflict, notFound } from "../errors.js";
import { logActivity } from "../services/activity-log.js";
export function flowRoutes(db: Db) {
  const r = Router(),
    base = "/companies/:companyId/video/flow";
  r.use(base, (req, _res, next) => {
    assertWorkspaceAdmin(req, z.string().uuid().parse(req.params.companyId));
    next();
  });
  r.get(`${base}/status`, async (req, res) => {
    let calibrated = false;
    try {
      flowRecipe.parse(
        JSON.parse(
          await readFile(
            join(flowDirectory(req.params.companyId as string), "recipe.json"),
            "utf8"
          )
        )
      );
      calibrated = true;
    } catch {}
    res.json({
      experimental: true,
      calibrated,
      enabled: process.env.SORAVYN_FLOW_ENABLED === "true",
      loginCommand: `pnpm flow:login --company ${req.params.companyId}`,
      reason: calibrated
        ? "La connexion et les contrôles visibles seront vérifiés avant le clic."
        : "Connexion Google et calibration locale requises. Aucun sélecteur de génération présumé.",
    });
  });
  r.get(base, async (req, res) =>
    res.json(
      await db
        .select()
        .from(flowJobs)
        .where(eq(flowJobs.companyId, req.params.companyId as string))
        .orderBy(desc(flowJobs.createdAt))
        .limit(100)
    )
  );
  r.post(base, validate(flowRequest), async (req, res) => {
    const companyId = req.params.companyId as string;
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.id, req.body.campaignId),
          eq(campaigns.companyId, companyId)
        )
      );
    if (!campaign) throw notFound("Campaign not found");
    const [job] = await db
      .insert(flowJobs)
      .values({
        companyId,
        campaignId: campaign.id,
        prompt: req.body.prompt,
        maxCredits: req.body.maxCredits,
      })
      .returning();
    await logActivity(db, {
      companyId,
      ...getActorInfo(req),
      action: "flow.credits_authorized",
      entityType: "company",
      entityId: companyId,
      details: { jobId: job.id, maximumCredits: job.maxCredits },
    });
    res.status(201).json(job);
  });
  r.post(
    `${base}/:id/resume`,
    validate(
      z.object({ confirmNoGenerationSubmitted: z.literal(true) }).strict()
    ),
    async (req, res) => {
      const [job] = await db
        .update(flowJobs)
        .set({
          status: "queued",
          stage: "queued",
          message: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(flowJobs.id, z.string().uuid().parse(req.params.id)),
            eq(flowJobs.companyId, req.params.companyId as string),
            eq(flowJobs.status, "needs_attention"),
            eq(flowJobs.stage, "before_submission")
          )
        )
        .returning();
      if (!job)
        throw conflict(
          "Only a job stopped before submission can resume automatically"
        );
      res.json(job);
    }
  );
  r.post(`${base}/:id/cancel`, async (req, res) => {
    const [job] = await db
      .update(flowJobs)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(
        and(
          eq(flowJobs.id, z.string().uuid().parse(req.params.id)),
          eq(flowJobs.companyId, req.params.companyId as string),
          eq(flowJobs.status, "queued")
        )
      )
      .returning();
    if (!job) throw conflict("Only queued jobs can be cancelled safely");
    res.json(job);
  });
  r.get(`${base}/:id/video`, async (req, res) => {
    const [job] = await db
      .select()
      .from(flowJobs)
      .where(
        and(
          eq(flowJobs.id, z.string().uuid().parse(req.params.id)),
          eq(flowJobs.companyId, req.params.companyId as string),
          eq(flowJobs.status, "succeeded")
        )
      );
    if (!job) throw notFound("Flow video not found");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.sendFile(
      join(flowDirectory(job.companyId), "jobs", job.id, "output.mp4"),
      { dotfiles: "allow" }
    );
  });
  return r;
}
