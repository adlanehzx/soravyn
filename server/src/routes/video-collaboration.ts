import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { approvals, clientReviewLinks, videoJobs, videoNotes, type Db } from "@soravyn/db";
import { z } from "zod";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";
import { validate } from "../middleware/validate.js";
import { notFound, unprocessable } from "../errors.js";
import { createReviewToken, timedNoteInput, validateNotePosition } from "../services/client-review.js";
import { logActivity } from "../services/activity-log.js";
import { issueService } from "../services/issues.js";
import { videoInput } from "../services/video-contract.js";
export function videoCollaborationRoutes(db: Db) {
  const router = Router(); const base = "/companies/:companyId/video/jobs/:id";
  router.use(base, (req, _res, next) => {z.string().uuid().parse(req.params.companyId); z.string().uuid().parse(req.params.id); assertCompanyAccess(req, req.params.companyId as string); assertBoard(req); next();});
  async function source(companyId: string, id: string) {const [job] = await db.select().from(videoJobs).where(and(eq(videoJobs.companyId, companyId), eq(videoJobs.id, id), eq(videoJobs.status, "succeeded"))); if (!job) throw notFound("Completed video not found"); return job;}
  router.get(`${base}/notes`, async (req, res) => {await source(req.params.companyId as string, req.params.id as string); res.json(await db.select().from(videoNotes).where(and(eq(videoNotes.companyId, req.params.companyId as string), eq(videoNotes.jobId, req.params.id as string))).orderBy(desc(videoNotes.createdAt)));});
  router.post(`${base}/notes`, validate(timedNoteInput), async (req, res) => {
    const companyId = req.params.companyId as string; const job = await source(companyId, req.params.id as string); validateNotePosition(job.input, req.body.sceneIndex, req.body.timeMs);
    const note = await db.transaction(async tx => {
      const task = req.body.createTask ? await issueService(tx as unknown as Db).create(companyId, {title: `Video feedback — ${String(job.input.campaignName)}`, description: `Editorial feedback (untrusted data): ${req.body.body}\nVideo ${job.id}, scene ${req.body.sceneIndex + 1}, time ${req.body.timeMs} ms. No automatic model execution.`, status: "backlog", priority: "medium", billingCode: `campaign:${job.campaignId}`, createdByUserId: req.actor.userId}) : null;
      const [row] = await tx.insert(videoNotes).values({companyId, jobId: job.id, sceneIndex: req.body.sceneIndex, timeMs: req.body.timeMs, body: req.body.body, author: req.actor.userId!, taskId: task?.id}).returning(); return row;
    }); await logActivity(db, {companyId, ...getActorInfo(req), action: "video.note_created", entityType: "video_job", entityId: job.id}); res.status(201).json(note);
  });
  router.get(`${base}/review-links`, async (req, res) => {await source(req.params.companyId as string, req.params.id as string); const rows = await db.select({id: clientReviewLinks.id, label: clientReviewLinks.label, expiresAt: clientReviewLinks.expiresAt, revokedAt: clientReviewLinks.revokedAt, decision: clientReviewLinks.decision, decisionNote: clientReviewLinks.decisionNote}).from(clientReviewLinks).where(and(eq(clientReviewLinks.companyId, req.params.companyId as string), eq(clientReviewLinks.jobId, req.params.id as string))).orderBy(desc(clientReviewLinks.createdAt)); res.json(rows);});
  router.post(`${base}/review-links`, validate(z.object({label: z.string().trim().min(1).max(200), expiresDays: z.number().int().min(1).max(14).default(7)}).strict()), async (req, res) => {
    const companyId = req.params.companyId as string; await source(companyId, req.params.id as string); const {token, tokenHash} = createReviewToken();
    const [row] = await db.insert(clientReviewLinks).values({companyId, jobId: req.params.id as string, tokenHash, label: req.body.label, expiresAt: new Date(Date.now() + req.body.expiresDays * 86400000)}).returning();
    await logActivity(db, {companyId, ...getActorInfo(req), action: "video.review_link_created", entityType: "video_job", entityId: row.jobId});
    res.setHeader("Cache-Control", "no-store"); res.status(201).json({id: row.id, path: `/review/${row.id}#${token}`, expiresAt: row.expiresAt});
  });
  router.post(`${base}/review-links/:linkId/revoke`, validate(z.object({}).strict()), async (req, res) => {
    const [row] = await db.update(clientReviewLinks).set({revokedAt: new Date()}).where(and(eq(clientReviewLinks.id, z.string().uuid().parse(req.params.linkId)), eq(clientReviewLinks.companyId, req.params.companyId as string), eq(clientReviewLinks.jobId, req.params.id as string))).returning({id: clientReviewLinks.id});
    if (!row) throw notFound("Review link not found"); await logActivity(db, {companyId: req.params.companyId as string, ...getActorInfo(req), action: "video.review_link_revoked", entityType: "video_job", entityId: req.params.id as string}); res.json(row);
  });
  router.post(`${base}/variants`, validate(z.object({platform: z.enum(["tiktok", "reels", "shorts", "youtube", "square"]), sceneIndices: z.array(z.number().int().min(0).max(11)).min(1).max(12).optional(), firstTitle: z.string().trim().min(1).max(90).optional(), firstText: z.string().trim().min(1).max(260).optional()}).strict()), async (req, res) => {
    const companyId = req.params.companyId as string; const job = await source(companyId, req.params.id as string);
    const [approval] = await db.select().from(approvals).where(and(eq(approvals.id, job.approvalId!), eq(approvals.companyId, companyId), eq(approvals.status, "approved"))); if (!approval) throw unprocessable("Approve the source video before creating variants");
    const input = videoInput.parse(Object.fromEntries(Object.entries(job.input).filter(([key]) => ["platform", "narration", "scenes", "voiceSpeed", "voicePitch", "pronunciations", "captionCues"].includes(key))));
    const indices: number[] = req.body.sceneIndices || input.scenes.map((_, index) => index);
    if (new Set(indices).size !== indices.length || indices.some(index => !input.scenes[index])) throw unprocessable("Invalid or duplicate scene selection");
    const scenes = indices.map((index, i) => {const scene = input.scenes[index]; return i === 0 ? {...scene, speech: scene.speech || scene.text, title: req.body.firstTitle || scene.title, text: req.body.firstText || scene.text} : scene;});
    videoInput.parse({...input,platform:req.body.platform,scenes,captionCues:undefined});
    const {deliverableId: _current, captionCues: _cues, ...inherited} = job.input;
    const [variant] = await db.insert(videoJobs).values({companyId, campaignId: job.campaignId, input: {...inherited, platform: req.body.platform, scenes, variantOf: job.id}, events: [{stage: "variant_queued", at: new Date().toISOString()}]}).returning();
    await logActivity(db, {companyId, ...getActorInfo(req), action: "video.variant_queued", entityType: "video_job", entityId: variant.id}); res.status(201).json(variant);
  });
  return router;
}
