import { z } from "zod";
export const workspaceRoles = [
  "admin",
  "project_manager",
  "creative",
  "client",
] as const;
export type WorkspaceRole = (typeof workspaceRoles)[number];
export function normalizeWorkspaceRole(
  role: string | null | undefined
): WorkspaceRole {
  return role === "owner" || role === "admin"
    ? "admin"
    : role === "creative" || role === "client"
    ? role
    : "project_manager";
}
export const apiCapabilities = [
  "activity.read",
  "organization.read",
  "tasks.read",
  "tasks.write",
  "campaigns.read",
  "deliverables.submit",
  "costs.report",
  "assets.read",
  "assets.write",
  "approvals.request",
] as const;
const cleanEndpoint = z
  .string()
  .url()
  .max(2000)
  .refine((value) => {
    const u = new URL(value);
    return (
      !u.username &&
      !u.password &&
      !u.search &&
      !u.hash &&
      ["https:", "http:"].includes(u.protocol)
    );
  }, "Use an endpoint without credentials or query parameters");
export const agentPolicyInput = z
  .object({
    mode: z.enum(["blocked", "isolated_process", "trusted"]),
    allowExternalAccess: z.boolean().default(false),
    requireTaskContext: z.boolean().default(true),
    allowedAdapters: z.array(z.string().min(1).max(80)).min(1).max(20),
    allowedCommands: z
      .array(
        z
          .string()
          .min(1)
          .max(500)
          .refine((value) => value.startsWith("/") && !value.includes("\0"))
      )
      .max(20)
      .default([]),
    workspaceRoot: z.string().max(2000).default(""),
    workspaceWritable: z.boolean().default(false),
    allowedEndpoints: z.array(cleanEndpoint).max(20).default([]),
    allowedEnvKeys: z
      .array(z.string().regex(/^[A-Z_][A-Z0-9_]*$/))
      .max(80)
      .default([]),
    apiCapabilities: z
      .array(z.enum(apiCapabilities))
      .max(20)
      .default([
        "organization.read",
        "tasks.read",
        "tasks.write",
        "campaigns.read",
        "deliverables.submit",
        "costs.report",
      ]),
    timeoutSec: z.number().int().min(1).max(1800).default(300),
    cpu: z.number().min(0.25).max(4).default(1),
    memoryMb: z.number().int().min(128).max(4096).default(512),
  })
  .strict()
  .superRefine((policy, ctx) => {
    if (policy.mode === "trusted" && !policy.allowExternalAccess)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Trusted execution requires explicit approval of host/network access",
      });
    if (
      policy.mode === "isolated_process" &&
      (!policy.workspaceRoot.startsWith("/") ||
        policy.allowedCommands.length === 0 ||
        policy.allowedAdapters.some((a) => a !== "process"))
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Isolated mode requires a dedicated absolute workspace, process adapter and allowed commands",
      });
  });
export type AgentExecutionPolicy = z.infer<typeof agentPolicyInput>;
export const governanceInput = z
  .object({
    requireAgentPolicy: z.boolean(),
    maxAgentRuns: z.number().int().min(1).max(32),
    maxVideoRuns: z.number().int().min(1).max(8),
    artifactRetentionDays: z.number().int().min(7).max(3650),
  })
  .strict();
export function roleAllows(
  role: WorkspaceRole,
  method: string,
  path: string
): boolean {
  const read = ["GET", "HEAD", "OPTIONS"].includes(method);
  const suffix = path.replace(/^\/companies\/[^/]+/, "");
  if (role === "admin") return true;
  if (suffix === "/access-role" && read) return true;
  if (role === "client")
    return (
      read && (/^\/client-deliverables(?:\/|$)/.test(suffix) || suffix === "")
    );
  if (
    /\/(?:secrets|secret-providers|members|join-requests|invites|governance|billing)(?:\/|$)/.test(
      path
    )
  )
    return false;
  if (
    read &&
    role === "project_manager" &&
    (/^\/heartbeat-runs\//.test(path) || suffix === "/heartbeat-runs")
  )
    return true;
  if (read) {
    if (/\/(?:log|events)(?:\/|$)/.test(path) && role !== "project_manager")
      return false;
    if (/\/(?:keys|config-revisions|cost-events)(?:\/|$)/.test(path))
      return false;
    return (
      /^\/(?:studio|video|assets|issues|agents|projects|goals|approvals|costs|dashboard|activity|sidebar-badges|live-runs)(?:\/|$)/.test(
        suffix
      ) ||
      /^\/(?:issues|projects|goals|approvals|assets)\//.test(path) ||
      suffix === ""
    );
  }
  if (/^\/assets\/images$/.test(suffix) && method === "POST") return true;
  if (/^\/approvals\/[^/]+\/(?:approve|reject|request-revision)$/.test(path))
    return role === "project_manager";
  if (/^\/(?:agents|heartbeat-runs)\//.test(path)) return false;
  if (/^\/issues\//.test(path) || /^\/issues$/.test(suffix))
    return method !== "DELETE";
  if (/^\/studio\//.test(suffix)) {
    if (
      /\/(?:budget|authorize|transition|schedule|measurements|render)(?:\/|$)/.test(
        suffix
      ) ||
      /\/decision$/.test(suffix)
    )
      return role === "project_manager";
    if (
      /\/workflow$/.test(suffix) ||
      /\/campaigns$/.test(suffix) ||
      /\/brand$/.test(suffix)
    )
      return role === "project_manager";
    return method !== "DELETE";
  }
  if (/^\/video\//.test(suffix)) return method !== "DELETE";
  return false;
}
