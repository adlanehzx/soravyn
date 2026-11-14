import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { realpath, mkdir } from "node:fs/promises";
import { relative, isAbsolute, join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  agentExecutionPolicies,
  companyGovernance,
  executionPermits,
  heartbeatRuns,
  companies,
  agents,
  issues,
  campaignBudgets,
  campaignReservations,
  costEvents,
  type Db,
} from "@soravyn/db";
import {
  agentPolicyInput,
  type AgentExecutionPolicy,
} from "./governance-contract.js";
import { forbidden, conflict } from "../errors.js";
import { runChildProcess } from "../adapters/utils.js";
import type {
  AdapterExecutionContext,
  AdapterExecutionResult,
} from "../adapters/types.js";
import { videoImage, videoRoot } from "./video-contract.js";
const execute = promisify(execFile);
export function boundedLimit(
  value: string | undefined,
  fallback: number,
  max: number
) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= max ? n : fallback;
}
export async function admissionPolicy(
  db: Db,
  companyId: string,
  agentId: string,
  adapter: string,
  config: Record<string, unknown>,
  issueId: string | null = null
) {
  const [governance] = await db
    .select()
    .from(companyGovernance)
    .where(eq(companyGovernance.companyId, companyId));
  const [row] = await db
    .select()
    .from(agentExecutionPolicies)
    .where(
      and(
        eq(agentExecutionPolicies.agentId, agentId),
        eq(agentExecutionPolicies.companyId, companyId)
      )
    );
  if (!row) {
    if (governance?.requireAgentPolicy)
      throw forbidden(
        "An approved execution policy is required for this agent"
      );
    return null;
  }
  const policy = agentPolicyInput.parse(row.policy);
  if (policy.requireTaskContext && !issueId)
    throw forbidden("Execution policy requires an assigned task context");
  if (policy.mode === "trusted") {
    const [agent] = await db
      .select({ budget: agents.budgetMonthlyCents })
      .from(agents)
      .where(eq(agents.id, agentId));
    if (!agent || agent.budget <= 0)
      throw forbidden(
        "Trusted execution requires a positive configured monthly budget"
      );
  }
  if (policy.mode === "blocked" || !policy.allowedAdapters.includes(adapter))
    throw forbidden("Adapter blocked by agent execution policy");
  if (
    adapter === "process" &&
    !policy.allowedCommands.includes(String(config.command || ""))
  )
    throw forbidden("Command is not allowed by agent execution policy");
  if (
    adapter === "http" &&
    !policy.allowedEndpoints.includes(String(config.url || ""))
  )
    throw forbidden("HTTP endpoint is not approved");
  const env =
    config.env && typeof config.env === "object"
      ? (config.env as Record<string, unknown>)
      : {};
  if (Object.keys(env).some((key) => !policy.allowedEnvKeys.includes(key)))
    throw forbidden("Environment variable is not approved for this agent");
  if (policy.mode === "isolated_process" && adapter !== "process")
    throw forbidden(
      "Only the process adapter supports this isolated execution mode"
    );
  return policy;
}
export async function admitAgentRun(
  db: Db,
  runId: string,
  companyId: string,
  agentId: string,
  issueId: string | null
) {
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext('soravyn:agent-admission'))`
    );
    const [run] = await tx
      .select()
      .from(heartbeatRuns)
      .where(
        and(eq(heartbeatRuns.id, runId), eq(heartbeatRuns.companyId, companyId))
      )
      .for("update");
    if (!run || run.status !== "running")
      throw conflict("Run is no longer active");
    await tx
      .update(executionPermits)
      .set({ status: "finished", finishedAt: new Date() })
      .where(
        and(
          eq(executionPermits.status, "active"),
          sql`${executionPermits.runId} in (select id from heartbeat_runs where status not in ('running','queued'))`
        )
      );
    const [company] = await tx
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .for("update");
    const [agent] = await tx
      .select()
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.companyId, companyId)));
    if (
      !company ||
      !agent ||
      ["paused", "terminated", "pending_approval"].includes(agent.status) ||
      company.status !== "active"
    )
      throw forbidden("Agent or company cannot execute");
    if (
      (company.budgetMonthlyCents > 0 &&
        company.spentMonthlyCents >= company.budgetMonthlyCents) ||
      (agent.budgetMonthlyCents > 0 &&
        agent.spentMonthlyCents >= agent.budgetMonthlyCents)
    )
      throw forbidden("Monthly budget is exhausted");
    const [governance] = await tx
      .select()
      .from(companyGovernance)
      .where(eq(companyGovernance.companyId, companyId));
    const active = await tx
      .select({ companyId: executionPermits.companyId })
      .from(executionPermits)
      .where(eq(executionPermits.status, "active"));
    if (
      active.length >=
        boundedLimit(process.env.SORAVYN_MAX_AGENT_RUNS, 8, 128) ||
      active.filter((row) => row.companyId === companyId).length >=
        (governance?.maxAgentRuns || 4)
    )
      throw conflict(
        "Concurrent agent execution quota reached; retry after an active run completes"
      );
    if (issueId) {
      const [task] = await tx
        .select()
        .from(issues)
        .where(and(eq(issues.id, issueId), eq(issues.companyId, companyId)));
      if (
        !task ||
        task.assigneeAgentId !== agentId ||
        ["done", "cancelled"].includes(task.status)
      )
        throw forbidden(
          "Execution task must be unfinished, assigned to this agent and inside the company"
        );
      const campaignId = /^campaign:([a-f0-9-]{36})$/i.exec(
        task.billingCode || ""
      )?.[1];
      if (campaignId) {
        const [budget] = await tx
          .select()
          .from(campaignBudgets)
          .where(
            and(
              eq(campaignBudgets.campaignId, campaignId),
              eq(campaignBudgets.companyId, companyId)
            )
          );
        if (budget) {
          const [reservation] = await tx
            .select()
            .from(campaignReservations)
            .where(
              and(
                eq(campaignReservations.companyId, companyId),
                eq(campaignReservations.campaignId, campaignId),
                eq(campaignReservations.taskId, issueId),
                isNull(campaignReservations.releasedAt)
              )
            );
          const [usage] = await tx
            .select({
              cents: sql<number>`coalesce(sum(${costEvents.costCents}),0)::int`,
            })
            .from(costEvents)
            .where(
              and(
                eq(costEvents.companyId, companyId),
                eq(costEvents.issueId, issueId)
              )
            );
          const [total] = await tx
            .select({
              cents: sql<number>`coalesce(sum(${costEvents.costCents}),0)::int`,
            })
            .from(costEvents)
            .innerJoin(issues, eq(costEvents.issueId, issues.id))
            .where(
              and(
                eq(costEvents.companyId, companyId),
                eq(issues.companyId, companyId),
                eq(issues.billingCode, `campaign:${campaignId}`)
              )
            );
          if (
            !reservation ||
            Number(usage.cents) >= reservation.amountCents ||
            Number(total.cents) >= budget.limitCents
          )
            throw forbidden(
              "Campaign execution requires an active authorization reservation with remaining budget"
            );
        }
      }
    }
    await tx
      .insert(executionPermits)
      .values({ runId, companyId, agentId, issueId, status: "active" });
  });
}
export async function finishAgentPermit(db: Db, runId: string) {
  await db
    .update(executionPermits)
    .set({ status: "finished", finishedAt: new Date() })
    .where(eq(executionPermits.runId, runId));
}
export function isolatedWorkspace(companyId: string, agentId: string) {
  return join(resolve(videoRoot()), "agent-workspaces", companyId, agentId);
}
export async function executeIsolatedAgent(
  ctx: AdapterExecutionContext,
  policy: AgentExecutionPolicy
): Promise<AdapterExecutionResult> {
  const expected = isolatedWorkspace(ctx.agent.companyId, ctx.agent.id);
  if (resolve(policy.workspaceRoot) !== expected)
    throw forbidden(
      "Isolated execution requires its dedicated managed workspace"
    );
  await mkdir(expected, { recursive: true, mode: 0o700 });
  const root = await realpath(expected);
  const base = await realpath(join(resolve(videoRoot()), "agent-workspaces"));
  if (!root.startsWith(base + "/"))
    throw forbidden("Isolated workspace resolves outside managed storage");
  const cwd = root;
  const sub = relative(root, cwd);
  if (sub.startsWith("..") || isAbsolute(sub))
    throw forbidden("Workspace is outside the approved root");
  const name = `soravyn-agent-${ctx.runId}`;
  const env: Record<string, string> = {};
  for (const key of policy.allowedEnvKeys) {
    const value = (ctx.config.env as Record<string, unknown> | undefined)?.[
      key
    ];
    if (typeof value === "string") env[key] = value;
  }
  const args = [
    "run",
    ...(ctx.context.recoveryCheckpoint ? ["--interactive"] : []),
    "--rm",
    "--name",
    name,
    "--network",
    "none",
    "--read-only",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--cpus",
    String(policy.cpu),
    "--memory",
    `${policy.memoryMb}m`,
    "--pids-limit",
    "128",
    "--tmpfs",
    "/tmp:rw,nosuid,size=64m",
    "--mount",
    `type=bind,src=${root},dst=/workspace${
      policy.workspaceWritable ? "" : ",readonly"
    }`,
    "--workdir",
    `/workspace${sub ? "/" + sub : ""}`,
    ...Object.keys(env).flatMap((key) => ["--env", key]),
    "--entrypoint",
    "/usr/bin/timeout",
    videoImage(),
    "--kill-after=5s",
    `${policy.timeoutSec}s`,
    String(ctx.config.command),
    ...(Array.isArray(ctx.config.args) ? ctx.config.args.map(String) : []),
  ];
  try {
    const result = await runChildProcess(ctx.runId, "docker", args, {
      cwd: root,
      env,
      ...(ctx.context.recoveryCheckpoint
        ? {
            stdin: JSON.stringify({
              recoveryCheckpoint: ctx.context.recoveryCheckpoint,
            }),
          }
        : {}),
      timeoutSec: policy.timeoutSec + 10,
      graceSec: 5,
      onLog: ctx.onLog,
    });
    return {
      exitCode: result.exitCode,
      signal: result.signal,
      timedOut: result.timedOut || result.exitCode === 124,
      errorMessage:
        result.exitCode === 0 ? null : "Isolated command failed or timed out",
      resultJson: {
        stdout: result.stdout,
        stderr: result.stderr,
        isolated: true,
      },
    };
  } finally {
    await execute("docker", ["rm", "-f", name], {
      timeout: 10000,
      env: { PATH: process.env.PATH, HOME: process.env.HOME },
    }).catch(() => {});
  }
}
