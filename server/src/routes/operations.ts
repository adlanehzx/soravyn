import { Router } from "express";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import {
  companyGovernance,
  agentExecutionPolicies,
  agents,
  heartbeatRuns,
  executionPermits,
  videoJobs,
  type Db,
} from "@soravyn/db";
import { z } from "zod";
import { stat, readdir, rename, mkdir, lstat } from "node:fs/promises";
import { join } from "node:path";
import { assertWorkspaceAdmin } from "./governance.js";
import { getActorInfo } from "./authz.js";
import { logActivity } from "../services/activity-log.js";
import { conflict, notFound } from "../errors.js";
import { validate } from "../middleware/validate.js";
import { videoRoot } from "../services/video-contract.js";
async function folderBytes(path: string): Promise<number> {
  try {
    let total = 0;
    for (const entry of await readdir(path, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const child = join(path, entry.name);
      total += entry.isDirectory()
        ? await folderBytes(child)
        : (await stat(child)).size;
    }
    return total;
  } catch {
    return 0;
  }
}
export function operationsRoutes(db: Db) {
  const router = Router();
  const base = "/companies/:companyId/governance/operations";
  router.use(base, (req, _res, next) => {
    assertWorkspaceAdmin(req, z.string().uuid().parse(req.params.companyId));
    next();
  });
  async function retention(companyId: string) {
    const [policy] = await db
      .select()
      .from(companyGovernance)
      .where(eq(companyGovernance.companyId, companyId));
    const cutoff = new Date(
      Date.now() - (policy?.artifactRetentionDays || 30) * 86400000
    );
    return db
      .select()
      .from(videoJobs)
      .where(
        and(
          eq(videoJobs.companyId, companyId),
          inArray(videoJobs.status, [
            "failed",
            "cancelled",
            "preview_ready",
            "audio_ready",
          ]),
          lt(videoJobs.updatedAt, cutoff)
        )
      )
      .orderBy(videoJobs.updatedAt)
      .limit(50);
  }
  router.get(base, async (req, res) => {
    const companyId = req.params.companyId as string;
    const failures = await db
      .select({
        id: heartbeatRuns.id,
        status: heartbeatRuns.status,
        errorCode: heartbeatRuns.errorCode,
        createdAt: heartbeatRuns.createdAt,
      })
      .from(heartbeatRuns)
      .where(
        and(
          eq(heartbeatRuns.companyId, companyId),
          inArray(heartbeatRuns.status, ["failed", "timed_out"])
        )
      )
      .orderBy(desc(heartbeatRuns.createdAt))
      .limit(20);
    const workerFailures = await db
      .select({
        id: videoJobs.id,
        status: videoJobs.status,
        error: videoJobs.error,
        updatedAt: videoJobs.updatedAt,
      })
      .from(videoJobs)
      .where(
        and(eq(videoJobs.companyId, companyId), eq(videoJobs.status, "failed"))
      )
      .orderBy(desc(videoJobs.updatedAt))
      .limit(20);
    const policies = await db
      .select({
        id: agents.id,
        name: agents.name,
        policy: agentExecutionPolicies.policy,
      })
      .from(agents)
      .leftJoin(
        agentExecutionPolicies,
        eq(agentExecutionPolicies.agentId, agents.id)
      )
      .where(eq(agents.companyId, companyId));
    const active = await db
      .select()
      .from(executionPermits)
      .where(
        and(
          eq(executionPermits.companyId, companyId),
          eq(executionPermits.status, "active")
        )
      );
    const warnings = policies
      .filter((row) => !row.policy || row.policy.mode === "trusted")
      .map((row) => ({
        code: row.policy
          ? "trusted_host_execution"
          : "legacy_agent_without_policy",
        agentId: row.id,
        message: `${row.name} : ${
          row.policy
            ? "exécution locale avec accès de confiance"
            : "aucune politique d’exécution explicite"
        }`,
      }));
    res.json({
      generatedAt: new Date().toISOString(),
      activeAgentPermits: active.length,
      recentRunFailures: failures,
      recentProductionFailures: workerFailures,
      warnings,
      retentionCandidates: (await retention(companyId)).length,
      retentionMode:
        "Manual reversible archive; final approved deliverables are excluded",
    });
  });
  router.get(`${base}/retention`, async (req, res) => {
    const companyId = req.params.companyId as string;
    const rows = await retention(companyId);
    res.json(
      await Promise.all(
        rows.map(async (row) => ({
          id: row.id,
          status: row.status,
          updatedAt: row.updatedAt,
          bytes: await folderBytes(join(videoRoot(), companyId, row.id)),
        }))
      )
    );
  });
  router.post(
    `${base}/retention/archive`,
    validate(
      z
        .object({
          jobIds: z.array(z.string().uuid()).min(1).max(50),
          confirmArchive: z.literal(true),
        })
        .strict()
    ),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const eligible = new Map(
        (await retention(companyId)).map((row) => [
          row.id,
          row.updatedAt.getTime(),
        ])
      );
      const archived: string[] = [];
      for (const id of req.body.jobIds as string[]) {
        if (!eligible.has(id)) continue;
        await db.transaction(async (tx) => {
          const [job] = await tx
            .select()
            .from(videoJobs)
            .where(
              and(eq(videoJobs.id, id), eq(videoJobs.companyId, companyId))
            )
            .for("update");
          if (
            !job ||
            eligible.get(id) !== job.updatedAt.getTime() ||
            !["failed", "cancelled", "preview_ready", "audio_ready"].includes(
              job.status
            )
          )
            return;
          const archiveName = `${id}-${Date.now()}`;
          const destination = join(videoRoot(), ".retention", companyId, archiveName);
          await mkdir(join(videoRoot(), ".retention", companyId), {
            recursive: true,
            mode: 0o700,
          });
          try {
            await rename(join(videoRoot(), companyId, id), destination);
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
            return;
          }
          await tx
            .update(videoJobs)
            .set({
              input: {
                ...job.input,
                artifactsArchivedAt: new Date().toISOString(),
                artifactArchiveName: archiveName,
              },
              updatedAt: new Date(),
            })
            .where(eq(videoJobs.id, id));
          archived.push(id);
        });
      }
      await logActivity(db, {
        companyId,
        ...getActorInfo(req),
        action: "operations.artifacts_archived",
        entityType: "company",
        entityId: companyId,
        details: { jobIds: archived },
      });
      res.json({ archived, mode: "reversible_archive" });
    }
  );
  router.get(`${base}/archives`, async(req,res)=>{
    const rows=await db.select({id:videoJobs.id,status:videoJobs.status,input:videoJobs.input}).from(videoJobs).where(eq(videoJobs.companyId,req.params.companyId as string));
    res.json(rows.filter(row=>typeof row.input.artifactArchiveName==="string").map(row=>({id:row.id,status:row.status,archivedAt:row.input.artifactsArchivedAt})));
  });
  router.post(`${base}/retention/:jobId/restore`,validate(z.object({confirmRestore:z.literal(true)}).strict()),async(req,res)=>{
    const companyId=req.params.companyId as string;const id=z.string().uuid().parse(req.params.jobId);
    await db.transaction(async tx=>{
      const [job]=await tx.select().from(videoJobs).where(and(eq(videoJobs.id,id),eq(videoJobs.companyId,companyId))).for("update");
      if(!job)throw notFound("Job not found");
      const name=job.input.artifactArchiveName;
      if(typeof name!=="string"||!new RegExp(`^${id}-[0-9]{13}$`).test(name)||!["failed","cancelled","preview_ready","audio_ready"].includes(job.status))throw conflict("No restorable archive for this job");
      const source=join(videoRoot(),".retention",companyId,name),destination=join(videoRoot(),companyId,id);
      const info=await lstat(source).catch(()=>null);if(!info||!info.isDirectory()||info.isSymbolicLink())throw conflict("Archive unavailable");
      if(await lstat(destination).then(()=>true,()=>false))throw conflict("Current artifacts already exist; restoration would overwrite them");
      await mkdir(join(videoRoot(),companyId),{recursive:true,mode:0o700});
      await rename(source,destination);
      const {artifactArchiveName,artifactsArchivedAt,...input}=job.input;
      await tx.update(videoJobs).set({input,updatedAt:new Date()}).where(eq(videoJobs.id,id));
    });
    await logActivity(db,{companyId,...getActorInfo(req),action:"operations.artifacts_restored",entityType:"video_job",entityId:id});
    res.json({restored:id});
  });
  return router;
}
