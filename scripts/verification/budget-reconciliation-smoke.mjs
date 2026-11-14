import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
const proof = JSON.parse(
  await readFile("/tmp/soravyn-governance-proof.json", "utf8")
);
const origin = process.env.SORAVYN_TEST_URL || "http://127.0.0.1:3206";
const base = `/companies/${proof.companyId}`;
async function call(path, method = "GET", body, status = 200) {
  const r = await fetch(origin + "/api" + path, {
    method,
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  assert.equal(r.status, status, JSON.stringify(data));
  return data;
}
const campaign = await call(
  base + "/studio/campaigns",
  "POST",
  {
    name: "Budget reconciliation verification",
    objectives: "Verify declared costs",
    brief: "No model calls.",
  },
  201
);
const agent = await call(
  base + "/agents",
  "POST",
  {
    name: "Budget reconciliation fixture",
    adapterType: "process",
    adapterConfig: { command: "/usr/bin/true" },
    runtimeConfig: { heartbeat: { enabled: false } },
    budgetMonthlyCents: 1000,
  },
  201
);
const task = await call(
  base + "/issues",
  "POST",
  {
    title: "Authorized fixture task",
    assigneeAgentId: agent.id,
    status: "backlog",
    billingCode: `campaign:${campaign.id}`,
  },
  201
);
const budget = base + `/studio/campaigns/${campaign.id}/budget`;
await call(budget, "PUT", { limitCents: 100 });
await call(budget + "/reservations", "POST", {
  taskId: task.id,
  maximumCostCents: 80,
  confirmConfiguredModelCosts: true,
});
await call(
  base + "/cost-events",
  "POST",
  {
    agentId: agent.id,
    issueId: task.id,
    provider: "verification-fixture",
    model: "no-model-called",
    costCents: 30,
    occurredAt: new Date().toISOString(),
  },
  201
);
let view = await call(budget);
assert.equal(view.reportedCents, 30);
assert.equal(view.reservedCents, 50);
assert.equal(view.remainingCents, 20);
view = await call(budget + "/reservations", "POST", {
  taskId: task.id,
  maximumCostCents: 60,
  confirmConfiguredModelCosts: true,
});
assert.equal(view.reservedCents, 60);
assert.equal(view.remainingCents, 10);
await call(
  budget + "/reservations",
  "POST",
  { taskId: task.id, maximumCostCents: 71, confirmConfiguredModelCosts: true },
  409
);
const outcome = {
  passed: true,
  checks: [
    "declared fixture cost reduces unspent reservation without double counting",
    "renewal authorizes future spending plus already reported cost",
    "oversubscribed renewal rejected",
  ],
  realProviderBilling: false,
};
await writeFile(
  "/tmp/soravyn-budget-reconciliation-proof.json",
  JSON.stringify(outcome, null, 2)
);
console.log(JSON.stringify(outcome, null, 2));
