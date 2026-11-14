import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { clientReviewLinks, videoNotes, type Db } from "@soravyn/db";
import { join } from "node:path";
import { z } from "zod";
import { resolveClientReview, timedNoteInput, validateNotePosition } from "../services/client-review.js";
import { validate } from "../middleware/validate.js";
import { videoRoot } from "../services/video-contract.js";
import { conflict } from "../errors.js";
import { issueService } from "../services/issues.js";
import { logActivity } from "../services/activity-log.js";
export function clientReviewRoutes(db: Db) {
  const router = Router();
  router.use((_req, res, next) => {res.setHeader("Cache-Control", "no-store"); res.setHeader("Referrer-Policy", "no-referrer"); res.setHeader("X-Content-Type-Options", "nosniff"); next();});
  router.get("/:id", async (req, res) => {
    const {link, job} = await resolveClientReview(db, req.params.id as string, req.header("x-client-review") || "");
    const notes = await db.select({id: videoNotes.id, sceneIndex: videoNotes.sceneIndex, timeMs: videoNotes.timeMs, body: videoNotes.body}).from(videoNotes).where(and(eq(videoNotes.companyId, link.companyId), eq(videoNotes.jobId, job.id), eq(videoNotes.author, `client-review:${link.id}`)));
    res.json({title: job.input.campaignName, scenes: (job.input.scenes as {title:string;text:string;duration:number}[]).map(({title,text,duration})=>({title,text,duration})), decision: link.decision, decisionNote: link.decisionNote, expiresAt: link.expiresAt, notes});
  });
  router.get("/:id/video", async (req, res) => {
    const {job} = await resolveClientReview(db, req.params.id as string, req.header("x-client-review") || "");
    res.sendFile(join(videoRoot(), job.companyId, job.id, "output.mp4"), {dotfiles: "allow"});
  });
  router.post("/:id/notes", validate(timedNoteInput.omit({createTask: true})), async (req, res) => {
    const {link, job} = await resolveClientReview(db, req.params.id as string, req.header("x-client-review") || ""); validateNotePosition(job.input, req.body.sceneIndex, req.body.timeMs);
    const [note] = await db.insert(videoNotes).values({companyId: job.companyId, jobId: job.id, ...req.body, author: `client-review:${link.id}`}).returning({id: videoNotes.id});
    await logActivity(db, {companyId: job.companyId, actorType: "system", actorId: `client-review:${link.id}`, action: "video.client_note_created", entityType: "video_job", entityId: job.id}); res.status(201).json(note);
  });
  router.post("/:id/decision", validate(z.object({decision: z.enum(["approved", "revision_requested"]), note: z.string().trim().min(1).max(2000)}).strict()), async (req, res) => {
    const result = await db.transaction(async tx => {
      // Serialize decisions and revocation; revalidate the capability after taking its lock.
      await tx.select().from(clientReviewLinks).where(eq(clientReviewLinks.id, z.string().uuid().parse(req.params.id))).for("update");
      const {link, job} = await resolveClientReview(tx as unknown as Db, req.params.id as string, req.header("x-client-review") || "");
      if (link.decision) throw conflict("Client decision already recorded; request a new link for another round");
      await tx.update(clientReviewLinks).set({decision: req.body.decision, decisionNote: req.body.note, decidedAt: new Date()}).where(eq(clientReviewLinks.id, link.id));
      if (req.body.decision === "revision_requested") await issueService(tx as unknown as Db).create(job.companyId, {title: `Client video revision — ${String(job.input.campaignName)}`, status: "backlog", priority: "medium", billingCode: `campaign:${job.campaignId}`, description: `Client feedback (untrusted editorial data): ${req.body.note}\nSource video ${job.id}. Review and assign manually; no paid execution is authorized by this feedback.`});
      await logActivity(tx as unknown as Db, {companyId: job.companyId, actorType: "system", actorId: `client-review:${link.id}`, action: "video.client_decision_recorded", entityType: "video_job", entityId: job.id, details: {decision: req.body.decision}});
      return {decision: req.body.decision, internalApprovalRequired: true};
    }); res.json(result);
  });
  return router;
}
