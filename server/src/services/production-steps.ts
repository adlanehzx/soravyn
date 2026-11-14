import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { productionSteps, videoJobs, type Db } from "@soravyn/db";
import { z } from "zod";
export type StepRunner = <T extends Record<string, unknown>>(stage: string, input: unknown, schema: z.ZodType<T>, produce: () => Promise<T>, acceptCached?: (output: T) => Promise<boolean>) => Promise<T>;
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)]));
  return value;
}
export function stepFingerprint(input: unknown) {return createHash("sha256").update(JSON.stringify(canonical(input))).digest("hex");}
export function durableSteps(db: Db, job: {id: string; companyId: string; leaseToken: string | null}, event: (stage: string) => Promise<void>): StepRunner {
  async function owned(tx: Db) {
    const [row] = await tx.select({id: videoJobs.id}).from(videoJobs).where(and(eq(videoJobs.id, job.id), eq(videoJobs.companyId, job.companyId), eq(videoJobs.status, "running"), eq(videoJobs.leaseToken, job.leaseToken!))).for("update");
    if (!row) throw new Error("Production lease lost");
  }
  return async (stage, input, schema, produce, acceptCached) => {
    const cacheKey = stepFingerprint(input);
    const [previous] = await db.select().from(productionSteps).where(and(eq(productionSteps.jobId, job.id), eq(productionSteps.companyId, job.companyId), eq(productionSteps.stage, stage)));
    if (previous?.status === "succeeded" && previous.cacheKey === cacheKey) {
      const parsed = schema.safeParse(previous.output);
      if (parsed.success && (!acceptCached || await acceptCached(parsed.data))) {await event(`${stage}_reused`); return parsed.data;}
    }
    await db.transaction(async transaction => {
      const tx = transaction as unknown as Db; await owned(tx);
      await tx.insert(productionSteps).values({companyId: job.companyId, jobId: job.id, stage, cacheKey, status: "running", attempts: (previous?.attempts || 0) + 1, startedAt: new Date()}).onConflictDoUpdate({target: [productionSteps.jobId, productionSteps.stage], set: {cacheKey, status: "running", output: null, errorCode: null, attempts: (previous?.attempts || 0) + 1, startedAt: new Date(), finishedAt: null}});
    });
    await event(`${stage}_started`);
    try {
      const output = schema.parse(await produce());
      await db.transaction(async transaction => {
        const tx = transaction as unknown as Db; await owned(tx);
        await tx.update(productionSteps).set({output, status: "succeeded", finishedAt: new Date(), errorCode: null}).where(and(eq(productionSteps.jobId, job.id), eq(productionSteps.companyId, job.companyId), eq(productionSteps.stage, stage)));
      });
      await event(`${stage}_completed`); return output;
    } catch (error) {
      await db.transaction(async transaction => {
        const tx = transaction as unknown as Db;
        await owned(tx);
        await tx.update(productionSteps).set({status: "failed", errorCode: (error instanceof z.ZodError || error instanceof SyntaxError) ? "invalid_output" : "execution_failed", finishedAt: new Date()}).where(and(eq(productionSteps.jobId, job.id), eq(productionSteps.companyId, job.companyId), eq(productionSteps.stage, stage)));
      }).catch(()=>{}); // A stale worker must never update a replacement worker's checkpoint.
      throw error;
    }
  };
}
