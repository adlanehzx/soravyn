import { describe, expect, it } from "vitest";
import {
  agentPolicyInput,
  normalizeWorkspaceRole,
  roleAllows,
} from "../services/governance-contract.js";
import { secretLogFilter } from "../services/secret-log-filter.js";
import { creativeQuality } from "../services/creative-quality.js";
import { boundedLimit } from "../services/agent-execution.js";
const company = "/companies/11111111-1111-4111-8111-111111111111";
describe("Workspace role capabilities", () => {
  it("keeps client access limited to approved deliveries", () => {
    expect(roleAllows("client", "GET", company + "/client-deliverables")).toBe(
      true
    );
    for (const path of [
      "/agents",
      "/video/jobs",
      "/studio/campaigns",
      "/governance",
      "/secrets",
    ])
      expect(roleAllows("client", "GET", company + path)).toBe(false);
    expect(roleAllows("client", "POST", company + "/client-deliverables")).toBe(
      false
    );
  });
  it("separates creative production from approval and administrative access", () => {
    expect(
      roleAllows("creative", "POST", company + "/video/campaigns/id/jobs")
    ).toBe(true);
    expect(roleAllows("creative", "POST", "/approvals/id/approve")).toBe(false);
    expect(roleAllows("creative", "PUT", company + "/governance")).toBe(false);
    expect(roleAllows("project_manager", "POST", "/approvals/id/approve")).toBe(
      true
    );
    expect(roleAllows("project_manager", "GET", company + "/secrets")).toBe(
      false
    );
    expect(roleAllows("creative", "POST", company + "/assets/images")).toBe(
      true
    );
  });
  it("normalizes legacy ownership without promoting members to administrators", () => {
    expect(normalizeWorkspaceRole("owner")).toBe("admin");
    expect(normalizeWorkspaceRole("member")).toBe("project_manager");
    expect(normalizeWorkspaceRole(null)).not.toBe("admin");
  });
});
describe("Execution policy contracts", () => {
  it("requires explicit trusted-host approval", () => {
    expect(
      agentPolicyInput.safeParse({
        mode: "trusted",
        allowedAdapters: ["process"],
      }).success
    ).toBe(false);
    expect(
      agentPolicyInput.safeParse({
        mode: "trusted",
        allowExternalAccess: true,
        allowedAdapters: ["process"],
      }).success
    ).toBe(true);
  });
  it("does not accept non-process isolation or credential-bearing HTTP endpoints", () => {
    expect(
      agentPolicyInput.safeParse({
        mode: "isolated_process",
        workspaceRoot: "/workspace",
        allowedCommands: ["/usr/bin/true"],
        allowedAdapters: ["claude_local"],
      }).success
    ).toBe(false);
    expect(
      agentPolicyInput.safeParse({
        mode: "trusted",
        allowExternalAccess: true,
        allowedAdapters: ["http"],
        allowedEndpoints: ["https://example.com/?key=secret"],
      }).success
    ).toBe(false);
    expect(boundedLimit("-3", 4, 32)).toBe(4);
  });
});
describe("Secret filtering", () => {
  it("masks a secret split across log chunks and flushes ordinary tails", () => {
    const filter = secretLogFilter(["test-secret-12345"]);
    let out = filter.write("stdout", "before test-sec");
    out += filter.write("stdout", "ret-12345 after");
    out += filter.write("stdout", "", true);
    expect(out).toBe("before [REDACTED] after");
    expect(
      filter.clean({ stdout: "test-secret-12345", nested: ["safe"] })
    ).toEqual({ stdout: "[REDACTED]", nested: ["safe"] });
  });
});
describe("Advisory content quality", () => {
  it("flags unfinished copy and unsupported numeric claims without inventing a score", () => {
    const report = creativeQuality(
      { body: "TODO : une croissance de 200% garantie." },
      { brief: "Une offre de lancement." }
    );
    expect(report.findings.map((f) => f.code)).toEqual(
      expect.arrayContaining([
        "placeholder",
        "unsupported_numbers",
        "absolute_claim",
      ])
    );
    expect(report).not.toHaveProperty("score");
  });
  it("does not call a brief-supplied number independently verified", () => {
    const report = creativeQuality(
      { body: "Livraison en 3 jours." },
      { brief: "Livraison en 3 jours." }
    );
    expect(report.findings.some((f) => f.code === "unsupported_numbers")).toBe(
      false
    );
    expect(report.limitations).toContain("pas une preuve indépendante");
  });
});
