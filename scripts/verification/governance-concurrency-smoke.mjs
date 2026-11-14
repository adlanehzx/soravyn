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
const team = [];
for (let i = 0; i < 2; i++) {
  const agent = await call(
    base + "/agents",
    "POST",
    {
      name: "Quota verification " + i,
      adapterType: "process",
      adapterConfig: {
        command: "/usr/local/bin/node",
        args: ["-e", "setTimeout(()=>console.log('quota run finished'),3000)"],
      },
      runtimeConfig: { heartbeat: { enabled: false } },
      budgetMonthlyCents: 1000,
    },
    201
  );
  await call(base + `/governance/agents/${agent.id}/policy`, "PUT", {
    mode: "isolated_process",
    allowedAdapters: ["process"],
    allowedCommands: ["/usr/local/bin/node"],
    timeoutSec: 10,
    cpu: 0.5,
    memoryMb: 128,
  });
  team.push(agent);
}
const tasks = await Promise.all(
  team.map((agent, i) =>
    call(
      base + "/issues",
      "POST",
      {
        title: "Quota task " + i,
        assigneeAgentId: agent.id,
        status: "backlog",
      },
      201
    )
  )
);
const starts = await Promise.all(
  team.map((agent, i) =>
    call(
      `/agents/${agent.id}/wakeup`,
      "POST",
      {
        source: "on_demand",
        triggerDetail: "manual",
        payload: { issueId: tasks[i].id },
      },
      202
    )
  )
);
let result;
for (let n = 0; n < 80; n++) {
  const runs = await call(base + "/heartbeat-runs?limit=100");
  const selected = starts.map((run) => runs.find((r) => r.id === run.id));
  if (
    selected.every((run) => run && !["queued", "running"].includes(run.status))
  ) {
    result = selected;
    break;
  }
  const operations = await call(base + "/governance/operations");
  assert.ok(operations.activeAgentPermits <= 1);
  await new Promise((resolve) => setTimeout(resolve, 250));
}
assert.ok(result);
assert.deepEqual(result.map((run) => run.status).sort(), [
  "failed",
  "succeeded",
]);
assert.ok(
  result.find((run) => run.status === "failed").error.includes("quota")
);
const outcome = {
  passed: true,
  companyId: proof.companyId,
  statuses: result.map((run) => run.status),
  checks: [
    "two real isolated commands requested concurrently",
    "company quota admits only one execution",
    "other execution stops before adapter launch",
    "all execution permits released",
  ],
};
assert.equal(
  (await call(base + "/governance/operations")).activeAgentPermits,
  0
);
proof.concurrency = outcome;
await writeFile(
  "/tmp/soravyn-governance-proof.json",
  JSON.stringify(proof, null, 2)
);
console.log(JSON.stringify(outcome, null, 2));
