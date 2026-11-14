import { Router } from "express";
import { and, desc, eq, isNull, inArray } from "drizzle-orm";
import { z } from "zod";
import { campaigns, campaignWorkflows, brandProfiles, videoJobs, campaignCopy, issues, campaignBudgets, campaignReservations, type Db } from "@soravyn/db";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";
import { validate } from "../middleware/validate.js";
import { conflict, notFound, unprocessable } from "../errors.js";
import { logActivity } from "../services/activity-log.js";
import { marketingCopyInput } from "../services/campaign-creative.js";
import { videoInput } from "../services/video-contract.js";
import { localScriptConfig } from "../services/video-script.js";
import { campaignBudgetView } from "../services/campaign-budget.js";

export function studioExtensionRoutes(db: Db) {
  const router = Router(); const base = "/companies/:companyId/studio/campaigns/:campaignId";
  router.use(base, async (req, _res, next) => {
    const companyId = z.string().uuid().parse(req.params.companyId); const campaignId = z.string().uuid().parse(req.params.campaignId);
    assertCompanyAccess(req, companyId); assertBoard(req);
    const [campaign] = await db.select().from(campaigns).where(and(eq(campaigns.id, campaignId), eq(campaigns.companyId, companyId)));
    if (!campaign) throw notFound("Campaign not found"); next();
  });
  const audit = (req: Parameters<typeof getActorInfo>[0], action: string, id: string) => logActivity(db, {companyId: req.params.companyId as string, ...getActorInfo(req), action, entityType: "campaign", entityId: id});
  router.get(`${base}/creative-packs`, async (req, res) => res.json(await db.select().from(videoJobs).where(and(eq(videoJobs.companyId, req.params.companyId as string), eq(videoJobs.campaignId, req.params.campaignId as string))).orderBy(desc(videoJobs.createdAt)).limit(100).then(rows => rows.filter(row => ["campaign_pack", "campaign_pack_ready"].includes(String(row.input.kind))))));
  router.post(`${base}/creative-packs`, validate(z.object({platform: z.enum(["tiktok", "reels", "shorts", "youtube", "square"])}).strict()), async (req, res) => {
    if (!localScriptConfig().model) throw unprocessable("Configure the local Ollama model on the API and worker first");
    const companyId = req.params.companyId as string; const campaignId = req.params.campaignId as string;
    const job = await db.transaction(async tx => {
      const [campaign] = await tx.select().from(campaigns).where(and(eq(campaigns.id, campaignId), eq(campaigns.companyId, companyId))).for("update");
      const pending = await tx.select({id: videoJobs.id}).from(videoJobs).where(and(eq(videoJobs.companyId, companyId), eq(videoJobs.campaignId, campaignId), inArray(videoJobs.status, ["queued", "running"])));
      if (pending.length) throw conflict("Finish or cancel the current campaign production first");
      const [workflow] = await tx.select().from(campaignWorkflows).where(and(eq(campaignWorkflows.campaignId, campaignId), eq(campaignWorkflows.companyId, companyId)));
      const [brand] = await tx.select().from(brandProfiles).where(eq(brandProfiles.companyId, companyId));
      if (!brand) throw unprocessable("Configure the client brand first");
      const [created] = await tx.insert(videoJobs).values({companyId, campaignId, input: {kind: "campaign_pack", platform: req.body.platform, campaignName: campaign.name, context: {brief: workflow?.briefSnapshot || campaign, brand: workflow?.brandSnapshot || brand}}, events: [{stage: "campaign_pack_queued", at: new Date().toISOString()}]}).returning(); return created;
    });
    await audit(req, "campaign.creative_pack_queued", campaignId); res.status(201).json(job);
  });
  router.post(`${base}/voice-preview`,validate(z.object({normalizeAudio:z.boolean().default(false),voiceGap:z.number().int().min(0).max(20).default(0),text:z.string().trim().min(1).max(260),narration:z.enum(["fr","en"]),voiceSpeed:z.number().int().min(100).max(220).default(145),voicePitch:z.number().int().min(0).max(99).default(50),pronunciations:z.array(z.object({from:z.string().trim().min(1).max(80),to:z.string().trim().min(1).max(120)}).strict()).max(20).default([])}).strict()),async(req,res)=>{
    const input=videoInput.parse({platform:"square",scenes:[{title:"Voice preview",text:req.body.text,duration:15}],narration:req.body.narration,normalizeAudio:req.body.normalizeAudio,voiceGap:req.body.voiceGap,voiceSpeed:req.body.voiceSpeed,voicePitch:req.body.voicePitch,pronunciations:req.body.pronunciations});
    const [job]=await db.insert(videoJobs).values({companyId:req.params.companyId as string,campaignId:req.params.campaignId as string,input:{...input,kind:"voice_preview",campaignName:"Préécoute narration"},events:[{stage:"voice_preview_queued",at:new Date().toISOString()}]}).returning();
    await audit(req,"campaign.voice_preview_queued",req.params.campaignId as string);res.status(201).json(job);
  });
  router.get(`${base}/copy`, async (req, res) => res.json(await db.select().from(campaignCopy).where(and(eq(campaignCopy.companyId, req.params.companyId as string), eq(campaignCopy.campaignId, req.params.campaignId as string))).orderBy(desc(campaignCopy.createdAt))));
  router.post(`${base}/copy`, validate(marketingCopyInput), async (req, res) => {
    const companyId = req.params.companyId as string; const campaignId = req.params.campaignId as string;
    if (req.body.sourceJobId) {const [job] = await db.select().from(videoJobs).where(and(eq(videoJobs.id, req.body.sourceJobId), eq(videoJobs.companyId, companyId), eq(videoJobs.campaignId, campaignId))); if (!job) throw unprocessable("Invalid source job");}
    if (req.body.revisionOf) {const [copy] = await db.select().from(campaignCopy).where(and(eq(campaignCopy.id, req.body.revisionOf), eq(campaignCopy.companyId, companyId), eq(campaignCopy.campaignId, campaignId))); if (!copy) throw unprocessable("Invalid source copy");}
    const [copy] = await db.insert(campaignCopy).values({...req.body, companyId, campaignId}).returning(); await audit(req, "campaign.copy_created", campaignId); res.status(201).json(copy);
  });
  router.post(`${base}/copy/:copyId/decision`, validate(z.object({decision: z.enum(["approved", "rejected"]), note: z.string().trim().max(2000).default("")}).strict()), async (req, res) => {
    if (req.body.decision === "rejected" && !req.body.note) throw unprocessable("A correction comment is required");
    const [copy] = await db.update(campaignCopy).set({status: req.body.decision, decisionNote: req.body.note}).where(and(eq(campaignCopy.id, z.string().uuid().parse(req.params.copyId)), eq(campaignCopy.companyId, req.params.companyId as string), eq(campaignCopy.campaignId, req.params.campaignId as string), eq(campaignCopy.status, "draft"))).returning();
    if (!copy) throw conflict("Draft not available or already decided"); await audit(req, "campaign.copy_decided", req.params.campaignId as string); res.json(copy);
  });
  router.get(`${base}/budget`, async (req, res) => res.json(await campaignBudgetView(db, req.params.companyId as string, req.params.campaignId as string)));
  router.put(`${base}/budget`, validate(z.object({limitCents: z.number().int().min(0).max(2147483647)}).strict()), async (req, res) => {
    const companyId = req.params.companyId as string; const campaignId = req.params.campaignId as string;
    const result = await db.transaction(async tx => {
      await tx.select().from(campaigns).where(and(eq(campaigns.id, campaignId), eq(campaigns.companyId, companyId))).for("update");
      const view = await campaignBudgetView(tx as unknown as Db, companyId, campaignId);
      if (req.body.limitCents < view.reportedCents + view.reservedCents) throw conflict("Limit is below reported and reserved usage");
      await tx.insert(campaignBudgets).values({companyId, campaignId, limitCents: req.body.limitCents}).onConflictDoUpdate({target: campaignBudgets.campaignId, set: {limitCents: req.body.limitCents, updatedAt: new Date()}});
      return campaignBudgetView(tx as unknown as Db, companyId, campaignId);
    }); await audit(req, "campaign.budget_updated", campaignId); res.json(result);
  });
  router.post(`${base}/budget/:reservationId/release`, validate(z.object({}).strict()), async (req, res) => {
    const [existing]=await db.select().from(campaignReservations).where(and(eq(campaignReservations.id,z.string().uuid().parse(req.params.reservationId)),eq(campaignReservations.companyId,req.params.companyId as string),eq(campaignReservations.campaignId,req.params.campaignId as string)));
    if(!existing)throw notFound("Reservation not found");
    const [task]=await db.select().from(issues).where(and(eq(issues.id,existing.taskId),eq(issues.companyId,req.params.companyId as string)));
    if(!task||!["done","cancelled","in_review"].includes(task.status))throw conflict("Review or finish the task before releasing its authorization reservation");
    const [reservation] = await db.update(campaignReservations).set({releasedAt: new Date()}).where(and(eq(campaignReservations.id, z.string().uuid().parse(req.params.reservationId)), eq(campaignReservations.companyId, req.params.companyId as string), eq(campaignReservations.campaignId, req.params.campaignId as string), isNull(campaignReservations.releasedAt))).returning();
    if (!reservation) throw notFound("Active reservation not found"); await audit(req, "campaign.reservation_released", req.params.campaignId as string); res.json(reservation);
  });
  return router;
}
