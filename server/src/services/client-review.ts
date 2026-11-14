import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { campaignDeliverables, clientReviewLinks, videoJobs, type Db } from "@soravyn/db";
import { z } from "zod";
import { forbidden, notFound, unprocessable } from "../errors.js";
export function createReviewToken() { const token = randomBytes(32).toString("base64url"); return {token, tokenHash: createHash("sha256").update(token).digest("hex")}; }
export function reviewTokenMatches(token: string, hash: string) {
  if (!/^[\w-]{43}$/.test(token) || !/^[a-f0-9]{64}$/.test(hash)) return false;
  return timingSafeEqual(createHash("sha256").update(token).digest(), Buffer.from(hash, "hex"));
}
export async function resolveClientReview(db: Db, id: string, token: string) {
  if (!z.string().uuid().safeParse(id).success || !/^[\w-]{43}$/.test(token)) throw forbidden("Review link unavailable");
  const [link] = await db.select().from(clientReviewLinks).where(eq(clientReviewLinks.id, id));
  if (!link || link.revokedAt || link.expiresAt.getTime() <= Date.now() || !reviewTokenMatches(token, link.tokenHash)) throw forbidden("Review link unavailable");
  const [job] = await db.select().from(videoJobs).where(and(eq(videoJobs.id, link.jobId), eq(videoJobs.companyId, link.companyId), eq(videoJobs.status, "succeeded")));
  if (!job) throw notFound("Review artifact unavailable");
  if (typeof job.input.deliverableId === "string") {
    const [current] = await db.select({id: campaignDeliverables.id}).from(campaignDeliverables).where(and(eq(campaignDeliverables.id, job.input.deliverableId), eq(campaignDeliverables.companyId, link.companyId), eq(campaignDeliverables.videoJobId, job.id)));
    if (!current) throw forbidden("This video was replaced; request a new review link");
  }
  return {link, job};
}
export const timedNoteInput = z.object({sceneIndex: z.number().int().min(0).max(11), timeMs: z.number().int().min(0).max(90000), body: z.string().trim().min(1).max(2000), createTask: z.boolean().default(false)}).strict();
export function validateNotePosition(input: Record<string, unknown>, sceneIndex: number, timeMs: number) {
  const scenes = input.scenes as {duration: number}[] | undefined;
  if (!scenes?.[sceneIndex]) throw unprocessable("Scene not found");
  const start = scenes.slice(0, sceneIndex).reduce((n, scene) => n + scene.duration * 1000, 0);
  if (timeMs < start || timeMs >= start + scenes[sceneIndex].duration * 1000) throw unprocessable("Timecode must fall inside the selected scene");
}
