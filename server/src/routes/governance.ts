import { Router } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  agents,
  companyGovernance,
  agentExecutionPolicies,
  companyMemberships,
  authUsers,
  instanceUserRoles,
  heartbeatRuns,
  issues,
  taskCheckpoints,
  taskRecoveries,
  companies,
  videoJobs,
  type Db,
} from "@soravyn/db";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";
import { validate } from "../middleware/validate.js";
import {
  agentPolicyInput,
  governanceInput,
  normalizeWorkspaceRole,
  workspaceRoles,
} from "../services/governance-contract.js";
import { isolatedWorkspace } from "../services/agent-execution.js";
import {
  prepareTaskRecovery,
  saveTaskCheckpoint,
  taskCheckpointInput,
} from "../services/task-recovery.js";
import { heartbeatService } from "../services/heartbeat.js";
import { conflict, forbidden, notFound } from "../errors.js";
import { logActivity } from "../services/activity-log.js";
export function assertWorkspaceAdmin(
  req: Parameters<typeof assertBoard>[0],
  companyId: string
) {
  assertBoard(req);
  assertCompanyAccess(req, companyId);
  if (
    req.actor.type !== "board" ||
    (req.actor.source !== "local_implicit" &&
      !req.actor.isInstanceAdmin &&
      normalizeWorkspaceRole(
        req.actor.type === "board"
          ? req.actor.companyRoles?.[companyId]
          : undefined
      ) !== "admin")
  )
    throw forbidden("Workspace administrator required");
}
export function governanceRoutes(db: Db) {
  const router = Router();
  const base = "/companies/:companyId/governance";
  router.get("/companies/:companyId/access-role", (req, res) => {
    assertBoard(req);
    const companyId = z.string().uuid().parse(req.params.companyId);
    assertCompanyAccess(req, companyId);
    res.json({
      role:
        req.actor.source === "local_implicit" || req.actor.isInstanceAdmin
          ? "admin"
          : normalizeWorkspaceRole(
              req.actor.type === "board"
                ? req.actor.companyRoles?.[companyId]
                : undefined
            ),
      isInstanceAdmin: !!req.actor.isInstanceAdmin,
    });
  });
  router.use(base, (req, _res, next) => {
    assertWorkspaceAdmin(req, z.string().uuid().parse(req.params.companyId));
    next();
  });
  const audit = (
    req: Parameters<typeof getActorInfo>[0],
    action: string,
    id: string,
    details: Record<string, unknown> = {}
  ) =>
    logActivity(db, {
      companyId: req.params.companyId as string,
      ...getActorInfo(req),
      action,
      entityType: "governance",
      entityId: id,
      details,
    });
  router.get(base, async (req, res) => {
    const [row] = await db
      .select()
      .from(companyGovernance)
      .where(eq(companyGovernance.companyId, req.params.companyId as string));
    res.json(
      row || {
        requireAgentPolicy: false,
        maxAgentRuns: 4,
        maxVideoRuns: 1,
        artifactRetentionDays: 30,
      }
    );
  });
  router.put(base, validate(governanceInput), async (req, res) => {
    const companyId = req.params.companyId as string;
    const [row] = await db
      .insert(companyGovernance)
      .values({ ...req.body, companyId })
      .onConflictDoUpdate({
        target: companyGovernance.companyId,
        set: { ...req.body, updatedAt: new Date() },
      })
      .returning();
    await audit(req, "governance.updated", companyId);
    res.json(row);
  });
  router.get(`${base}/agents`, async (req, res) => {
    const rows = await db
      .select({ agent: agents, policy: agentExecutionPolicies })
      .from(agents)
      .leftJoin(
        agentExecutionPolicies,
        and(
          eq(agentExecutionPolicies.agentId, agents.id),
          eq(agentExecutionPolicies.companyId, agents.companyId)
        )
      )
      .where(eq(agents.companyId, req.params.companyId as string));
    res.json(
      rows.map((row) => ({
        id: row.agent.id,
        name: row.agent.name,
        status: row.agent.status,
        adapterType: row.agent.adapterType,
        command:
          typeof row.agent.adapterConfig.command === "string"
            ? row.agent.adapterConfig.command
            : null,
        policy: row.policy?.policy || null,
        recommendedWorkspace: isolatedWorkspace(
          row.agent.companyId,
          row.agent.id
        ),
      }))
    );
  });
  router.put(`${base}/agents/:agentId/policy`, async (req, res) => {
    const companyId = req.params.companyId as string;
    const agentId = z.string().uuid().parse(req.params.agentId);
    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.companyId, companyId)));
    if (!agent) throw notFound("Agent not found");
    const body = z.record(z.unknown()).parse(req.body);
    const policy = agentPolicyInput.parse({
      ...body,
      ...(body.mode === "isolated_process"
        ? { workspaceRoot: isolatedWorkspace(companyId, agentId) }
        : {}),
    });
    const [row] = await db
      .insert(agentExecutionPolicies)
      .values({ companyId, agentId, policy, approvedBy: req.actor.userId! })
      .onConflictDoUpdate({
        target: agentExecutionPolicies.agentId,
        set: { policy, approvedBy: req.actor.userId!, updatedAt: new Date() },
      })
      .returning();
    await audit(req, "agent.policy_approved", agentId, { mode: policy.mode });
    res.json({ agentId: row.agentId, policy: row.policy });
  });
  router.get(`${base}/members`, async (req, res) => {
    const rows = await db
      .select({ membership: companyMemberships, user: authUsers })
      .from(companyMemberships)
      .innerJoin(authUsers, eq(companyMemberships.principalId, authUsers.id))
      .where(
        and(
          eq(companyMemberships.companyId, req.params.companyId as string),
          eq(companyMemberships.principalType, "user"),
          eq(companyMemberships.status, "active")
        )
      );
    const admins = await db
      .select({ userId: instanceUserRoles.userId })
      .from(instanceUserRoles)
      .where(eq(instanceUserRoles.role, "instance_admin"));
    res.json(
      rows.map((row) => ({
        userId: row.user.id,
        name: row.user.name,
        email: row.user.email,
        role: normalizeWorkspaceRole(row.membership.membershipRole),
        isInstanceAdmin: admins.some((admin) => admin.userId === row.user.id),
      }))
    );
  });
  router.put(
    `${base}/members/:userId`,
    validate(z.object({ role: z.enum(workspaceRoles) }).strict()),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const userId = z.string().min(1).max(200).parse(req.params.userId);
      const [user] = await db
        .select({ id: authUsers.id })
        .from(authUsers)
        .where(eq(authUsers.id, userId));
      if (!user) throw notFound("Registered user not found");
      await db.transaction(async (tx) => {
        await tx
          .select()
          .from(companies)
          .where(eq(companies.id, companyId))
          .for("update");
        const members = await tx
          .select()
          .from(companyMemberships)
          .where(
            and(
              eq(companyMemberships.companyId, companyId),
              eq(companyMemberships.principalType, "user"),
              eq(companyMemberships.status, "active")
            )
          );
        const previous = members.find((m) => m.principalId === userId);
        if (
          previous &&
          normalizeWorkspaceRole(previous.membershipRole) === "admin" &&
          req.body.role !== "admin" &&
          members.filter(
            (m) => normalizeWorkspaceRole(m.membershipRole) === "admin"
          ).length <= 1
        )
          throw conflict("Keep at least one workspace administrator");
        await tx
          .insert(companyMemberships)
          .values({
            companyId,
            principalType: "user",
            principalId: userId,
            membershipRole: req.body.role,
            status: "active",
          })
          .onConflictDoUpdate({
            target: [
              companyMemberships.companyId,
              companyMemberships.principalType,
              companyMemberships.principalId,
            ],
            set: {
              membershipRole: req.body.role,
              status: "active",
              updatedAt: new Date(),
            },
          });
      });
      await audit(req, "workspace.role_updated", userId, {
        role: req.body.role,
      });
      res.json({ userId, role: req.body.role });
    }
  );
  router.delete(`${base}/instance-admins/:userId`, async (req, res) => {
    if (!req.actor.isInstanceAdmin)
      throw forbidden("Instance administrator required");
    const userId = z.string().min(1).max(200).parse(req.params.userId);
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext('soravyn:first-instance-admin'))`
      );
      const rows = await tx
        .select()
        .from(instanceUserRoles)
        .where(eq(instanceUserRoles.role, "instance_admin"));
      if (rows.some((row) => row.userId === userId) && rows.length <= 1)
        throw conflict("Cannot remove the final instance administrator");
      await tx
        .delete(instanceUserRoles)
        .where(
          and(
            eq(instanceUserRoles.userId, userId),
            eq(instanceUserRoles.role, "instance_admin")
          )
        );
    });
    await audit(req, "instance.admin_removed", userId);
    res.json({ userId, removed: true });
  });
  router.get(`${base}/recoverable`, async (req, res) => {
    const companyId = req.params.companyId as string;
    const runs = await db
      .select()
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.companyId, companyId))
      .orderBy(desc(heartbeatRuns.createdAt))
      .limit(200);
    const seen = new Set<string>();
    const result = [];
    for (const run of runs) {
      const issueId = run.contextSnapshot?.issueId;
      if (typeof issueId !== "string" || seen.has(issueId)) continue;
      seen.add(issueId);
      if (!["failed", "timed_out", "cancelled"].includes(run.status)) continue;
      const [task] = await db
        .select()
        .from(issues)
        .where(and(eq(issues.id, issueId), eq(issues.companyId, companyId)));
      if (!task || ["done", "cancelled"].includes(task.status)) continue;
      const checkpoints = await db
        .select()
        .from(taskCheckpoints)
        .where(
          and(
            eq(taskCheckpoints.companyId, companyId),
            eq(taskCheckpoints.issueId, issueId),
            eq(taskCheckpoints.runId, run.id)
          )
        )
        .orderBy(desc(taskCheckpoints.createdAt));
      const [recovery] = await db
        .select()
        .from(taskRecoveries)
        .where(
          and(
            eq(taskRecoveries.issueId, issueId),
            eq(taskRecoveries.sourceRunId, run.id)
          )
        );
      result.push({
        taskId: task.id,
        title: task.title,
        agentId: task.assigneeAgentId,
        sourceRunId: run.id,
        status: run.status,
        error: run.error,
        checkpoints,
        recovery: recovery || null,
      });
    }
    res.json(result);
  });
  router.get("/issues/:issueId/checkpoints", async (req, res) => {
    const issueId = z.string().uuid().parse(req.params.issueId);
    const [task] = await db.select().from(issues).where(eq(issues.id, issueId));
    if (!task) throw notFound("Task not found");
    assertCompanyAccess(req, task.companyId);
    res.json(
      await db
        .select()
        .from(taskCheckpoints)
        .where(
          and(
            eq(taskCheckpoints.companyId, task.companyId),
            eq(taskCheckpoints.issueId, issueId)
          )
        )
        .orderBy(desc(taskCheckpoints.createdAt))
    );
  });
  router.post(
    "/issues/:issueId/checkpoints",
    validate(taskCheckpointInput),
    async (req, res) => {
      if (req.actor.type !== "agent" || !req.actor.runId)
        throw forbidden("An active agent run is required");
      res
        .status(201)
        .json(
          await saveTaskCheckpoint(
            db,
            req.actor.companyId,
            z.string().uuid().parse(req.params.issueId),
            req.actor.agentId,
            req.actor.runId,
            req.body
          )
        );
    }
  );
  router.post(
    "/issues/:issueId/recovery",
    validate(
      z
        .object({
          sourceRunId: z.string().uuid(),
          confirmExternalEffectsReviewed: z.literal(true),
          confirmConfiguredModelCosts: z.literal(true),
        })
        .strict()
    ),
    async (req, res) => {
      assertBoard(req);
      const issueId = z.string().uuid().parse(req.params.issueId);
      const [task] = await db
        .select()
        .from(issues)
        .where(eq(issues.id, issueId));
      if (!task) throw notFound("Task not found");
      assertWorkspaceAdmin(req, task.companyId);
      const prepared = await prepareTaskRecovery(
        db,
        task.companyId,
        task.id,
        req.actor.userId!,
        req.body.sourceRunId
      );
      let run: null | { id: string } = null;
      try {
        run = await heartbeatService(db).wakeup(prepared.agentId, {
          source: "on_demand",
          triggerDetail: "manual",
          reason: "human_task_recovery",
          requestedByActorType: "user",
          requestedByActorId: req.actor.userId,
          contextSnapshot: {
            issueId: task.id,
            recoveryId: prepared.recovery.id,
            recoveryCheckpoint: prepared.checkpoint,
            wakeSource: "on_demand",
            wakeTriggerDetail: "manual",
          },
        });
      } catch {}
      if (run)
        await db
          .update(taskRecoveries)
          .set({ newRunId: run.id })
          .where(eq(taskRecoveries.id, prepared.recovery.id));
      await logActivity(db, {
        companyId: task.companyId,
        ...getActorInfo(req),
        action: "task.recovery_authorized",
        entityType: "issue",
        entityId: task.id,
        details: { recoveryId: prepared.recovery.id, runId: run?.id || null },
      });
      res
        .status(201)
        .json({
          ...prepared.recovery,
          newRunId: run?.id || null,
          warning: run
            ? null
            : "Recovery is recorded; the wake policy deferred execution. Start the task manually from AI Workforce.",
        });
    }
  );
  return router;
}
