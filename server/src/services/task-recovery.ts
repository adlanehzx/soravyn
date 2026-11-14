import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  taskCheckpoints,
  taskRecoveries,
  heartbeatRuns,
  issues,
  agents,
  type Db,
} from "@soravyn/db";
import { z } from "zod";
import { conflict, forbidden, notFound } from "../errors.js";
import { issueService } from "./issues.js";
import { sanitizeRecord } from "../redaction.js";
export const taskCheckpointInput = z
  .object({
    summary: z.string().trim().min(5).max(4000),
    output: z
      .object({
        completed: z.array(z.string().trim().min(1).max(1000)).max(40),
        nextActions: z.array(z.string().trim().min(1).max(1000)).max(40),
        notes: z.string().max(12000).default(""),
      })
      .strict(),
  })
  .strict();
export async function saveTaskCheckpoint(
  db: Db,
  companyId: string,
  issueId: string,
  agentId: string,
  runId: string,
  input: z.infer<typeof taskCheckpointInput>
) {
  return db.transaction(async (tx) => {
    const [task] = await tx
      .select()
      .from(issues)
      .where(and(eq(issues.id, issueId), eq(issues.companyId, companyId)))
      .for("update");
    const [run] = await tx
      .select()
      .from(heartbeatRuns)
      .where(
        and(
          eq(heartbeatRuns.id, runId),
          eq(heartbeatRuns.companyId, companyId),
          eq(heartbeatRuns.agentId, agentId),
          eq(heartbeatRuns.status, "running")
        )
      );
    if (
      !task ||
      !run ||
      task.assigneeAgentId !== agentId ||
      task.checkoutRunId !== runId ||
      (task.executionRunId && task.executionRunId !== runId) ||
      task.status !== "in_progress"
    )
      throw forbidden(
        "Checkpoint requires the active assigned run and task checkout"
      );
    const [row] = await tx
      .insert(taskCheckpoints)
      .values({
        companyId,
        issueId,
        agentId,
        runId,
        summary: input.summary,
        output: sanitizeRecord(input.output),
      })
      .returning();
    return row;
  });
}
export async function prepareTaskRecovery(
  db: Db,
  companyId: string,
  issueId: string,
  userId: string,
  sourceRunId: string
) {
  return db.transaction(async (tx) => {
    const [task] = await tx
      .select()
      .from(issues)
      .where(and(eq(issues.id, issueId), eq(issues.companyId, companyId)))
      .for("update");
    if (
      !task ||
      ["done", "cancelled"].includes(task.status) ||
      !task.assigneeAgentId
    )
      throw conflict("Only an unfinished assigned task can be resumed");
    const runs = await tx
      .select()
      .from(heartbeatRuns)
      .where(
        and(
          eq(heartbeatRuns.companyId, companyId),
          sql`${heartbeatRuns.contextSnapshot}->>'issueId'=${issueId}`
        )
      )
      .orderBy(desc(heartbeatRuns.createdAt))
      .limit(1);
    const source = runs[0];
    if (
      !source ||
      source.id !== sourceRunId ||
      !["failed", "timed_out", "cancelled"].includes(source.status) ||
      source.agentId !== task.assigneeAgentId
    )
      throw conflict(
        "Resume only the latest interrupted run of the current assignee"
      );
    const [existing] = await tx
      .select()
      .from(taskRecoveries)
      .where(
        and(
          eq(taskRecoveries.issueId, issueId),
          eq(taskRecoveries.sourceRunId, sourceRunId)
        )
      );
    if (existing)
      throw conflict("This interrupted run already has a recovery record");
    const [agent] = await tx
      .select()
      .from(agents)
      .where(
        and(
          eq(agents.id, task.assigneeAgentId),
          eq(agents.companyId, companyId)
        )
      );
    if (!agent || !["idle", "error"].includes(agent.status))
      throw conflict("The assigned agent must be idle before recovery");
    if (agent.status === "error")
      await tx
        .update(agents)
        .set({ status: "idle", updatedAt: new Date() })
        .where(eq(agents.id, agent.id));
    const [checkpoint] = await tx
      .select()
      .from(taskCheckpoints)
      .where(
        and(
          eq(taskCheckpoints.companyId, companyId),
          eq(taskCheckpoints.issueId, issueId),
          eq(taskCheckpoints.runId, sourceRunId)
        )
      )
      .orderBy(desc(taskCheckpoints.createdAt))
      .limit(1);
    const [recovery] = await tx
      .insert(taskRecoveries)
      .values({
        companyId,
        issueId,
        sourceRunId,
        checkpointId: checkpoint?.id,
        createdBy: userId,
      })
      .returning();
    await tx
      .update(issues)
      .set({
        status: "todo",
        checkoutRunId: null,
        executionRunId: null,
        executionAgentNameKey: null,
        executionLockedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(issues.id, issueId));
    await issueService(tx as unknown as Db).addComment(
      issueId,
      `Human-authorized recovery ${
        recovery.id
      } from interrupted run ${sourceRunId}. External side effects were reviewed. ${
        checkpoint
          ? "A structured checkpoint is available via the task checkpoints endpoint."
          : "No checkpoint was saved; inspect the previous logs before repeating any action."
      }`,
      { userId }
    );
    return {
      recovery,
      agentId: agent.id,
      checkpoint: checkpoint
        ? { summary: checkpoint.summary, output: checkpoint.output }
        : null,
    };
  });
}
