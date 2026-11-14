import type { RequestHandler } from "express";
import { and, eq } from "drizzle-orm";
import {
  agents,
  issues,
  projects,
  goals,
  approvals,
  assets,
  heartbeatRuns,
  companySecrets,
  agentExecutionPolicies,
  type Db,
} from "@soravyn/db";
import { forbidden } from "../errors.js";
import {
  agentPolicyInput,
  normalizeWorkspaceRole,
  roleAllows,
} from "../services/governance-contract.js";
export function agentCapability(method: string, path: string): string | null {
  const read = ["GET", "HEAD", "OPTIONS"].includes(method);
  if (read && /\/(?:activity|events)(?:\/|$)/.test(path))
    return "activity.read";
  if (/\/issues(?:\/|$)/.test(path)) return read ? "tasks.read" : "tasks.write";
  if (/\/studio\/campaigns\//.test(path))
    return read
      ? "campaigns.read"
      : /\/deliverables$/.test(path)
      ? "deliverables.submit"
      : null;
  if (/\/cost-events$/.test(path) && !read) return "costs.report";
  if (/\/assets(?:\/|$)/.test(path))
    return read ? "assets.read" : "assets.write";
  if (/\/approvals$/.test(path) && !read) return "approvals.request";
  if (
    read &&
    (/\/agents(?:\/|$)/.test(path) ||
      /^\/companies(?:\/[^/]+)?$/.test(path) ||
      /^\/skills\//.test(path))
  )
    return "organization.read";
  return null;
}
export function workspacePermissions(db: Db): RequestHandler {
  return async (req, _res, next) => {
    const path = req.originalUrl.split("?")[0].replace(/^\/api/, "");
    if (req.actor.type === "agent") {
      const [currentAgent] = await db
        .select({ status: agents.status })
        .from(agents)
        .where(eq(agents.id, req.actor.agentId));
      if (
        currentAgent?.status === "paused" &&
        !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
        !path.endsWith("/cost-events")
      )
        throw forbidden(
          "Paused agents cannot mutate work; cost reporting remains available"
        );
      const [row] = await db
        .select()
        .from(agentExecutionPolicies)
        .where(
          and(
            eq(agentExecutionPolicies.agentId, req.actor.agentId),
            eq(agentExecutionPolicies.companyId, req.actor.companyId)
          )
        );
      if (row) {
        const policy = agentPolicyInput.parse(row.policy);
        const capability = agentCapability(req.method, path);
        if (
          policy.mode === "blocked" ||
          !capability ||
          !policy.apiCapabilities.includes(
            capability as (typeof policy.apiCapabilities)[number]
          )
        )
          throw forbidden(
            "Agent API capability not granted by its execution policy"
          );
      }
      next();
      return;
    }
    if (
      req.actor.type !== "board" ||
      req.actor.source === "local_implicit" ||
      req.actor.isInstanceAdmin
    ) {
      next();
      return;
    }
    if (
      (req.method === "GET" &&
        ["/health", "/companies", "/companies/", "/companies/stats"].includes(
          path
        )) ||
      (req.method === "POST" && path === "/companies") ||
      (/^\/invites\/[^/]+(?:\/onboarding(?:\.txt)?)?$/.test(path) &&
        req.method === "GET") ||
      (/^\/invites\/[^/]+\/accept$/.test(path) && req.method === "POST")
    ) {
      next();
      return;
    }
    let companyId = /^\/companies\/([a-f0-9-]{36})(?:\/|$)/i.exec(path)?.[1];
    const target =
      /^\/(agents|issues|projects|goals|approvals|assets|heartbeat-runs|secrets)\/([a-f0-9-]{36})(?:\/|$)/i.exec(
        path
      );
    if (!companyId && target) {
      const id = target[2];
      let rows: { companyId: string }[] = [];
      switch (target[1]) {
        case "agents":
          rows = await db
            .select({ companyId: agents.companyId })
            .from(agents)
            .where(eq(agents.id, id));
          break;
        case "issues":
          rows = await db
            .select({ companyId: issues.companyId })
            .from(issues)
            .where(eq(issues.id, id));
          break;
        case "projects":
          rows = await db
            .select({ companyId: projects.companyId })
            .from(projects)
            .where(eq(projects.id, id));
          break;
        case "goals":
          rows = await db
            .select({ companyId: goals.companyId })
            .from(goals)
            .where(eq(goals.id, id));
          break;
        case "approvals":
          rows = await db
            .select({ companyId: approvals.companyId })
            .from(approvals)
            .where(eq(approvals.id, id));
          break;
        case "assets":
          rows = await db
            .select({ companyId: assets.companyId })
            .from(assets)
            .where(eq(assets.id, id));
          break;
        case "heartbeat-runs":
          rows = await db
            .select({ companyId: heartbeatRuns.companyId })
            .from(heartbeatRuns)
            .where(eq(heartbeatRuns.id, id));
          break;
        case "secrets":
          rows = await db
            .select({ companyId: companySecrets.companyId })
            .from(companySecrets)
            .where(eq(companySecrets.id, id));
          break;
      }
      companyId = rows[0]?.companyId;
    }
    if (
      !companyId ||
      !req.actor.companyIds?.includes(companyId) ||
      !roleAllows(
        normalizeWorkspaceRole(req.actor.companyRoles?.[companyId]),
        req.method,
        path
      )
    )
      throw forbidden("Workspace role does not permit this action");
    next();
  };
}
