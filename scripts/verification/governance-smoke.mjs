import assert from "node:assert/strict";
import { writeFile, readFile } from "node:fs/promises";
const local = process.env.SORAVYN_TEST_URL || "http://127.0.0.1:3206";
const authenticated =
  process.env.SORAVYN_AUTH_TEST_URL || "http://127.0.0.1:3205";
async function call(origin, path, method = "GET", body, status = 200, cookie) {
  const r = await fetch(origin + "/api" + path, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  assert.equal(r.status, status, `${method} ${path}: ${JSON.stringify(data)}`);
  return data;
}
const admin = (path, method = "GET", body, status = 200) =>
  call(local, path, method, body, status);
async function register(label) {
  const email = `${label}-${Date.now()}@soravyn.test`;
  const password = "Verify-" + crypto.randomUUID();
  const r = await fetch(authenticated + "/api/auth/sign-up/email", {
    method: "POST",
    headers: { Origin: authenticated, "Content-Type": "application/json" },
    body: JSON.stringify({ name: label, email, password }),
  });
  const data = await r.json();
  assert.equal(r.status, 200, JSON.stringify(data));
  const cookie = r.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  assert.ok(cookie);
  return { id: data.user.id, email, password, cookie };
}
async function waitRun(id, companyId) {
  for (let n = 0; n < 120; n++) {
    const run = (
      await admin(`/companies/${companyId}/heartbeat-runs?limit=200`)
    ).find((run) => run.id === id);
    if (!run) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      continue;
    }
    if (!["queued", "running"].includes(run.status)) return run;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Run did not finish");
}
try {
  const company = await admin(
    "/companies",
    "POST",
    { name: "Governance verification" },
    201
  );
  const cid = company.id;
  const base = `/companies/${cid}`;
  const gov = base + "/governance";
  const users = {
    manager: await register("Manager"),
    creative: await register("Creative"),
    client: await register("Client"),
    outsider: await register("Outsider"),
  };
  for (const [name, role] of [
    ["manager", "project_manager"],
    ["creative", "creative"],
    ["client", "client"],
  ])
    await admin(gov + "/members/" + users[name].id, "PUT", { role });
  const members = await admin(gov + "/members");
  for (const user of Object.values(users))
    assert.ok(
      !members.find((row) => row.userId === user.id)?.isInstanceAdmin,
      "Signup must not grant global administrator"
    );
  await call(
    authenticated,
    base + "/agents",
    "GET",
    undefined,
    403,
    users.client.cookie
  );
  await call(authenticated, gov, "GET", undefined, 403, users.manager.cookie);
  await call(
    authenticated,
    base + "/studio/campaigns",
    "POST",
    { name: "Denied", objectives: "Denied", brief: "Denied" },
    403,
    users.creative.cookie
  );
  await call(
    authenticated,
    base + "/client-deliverables",
    "GET",
    undefined,
    200,
    users.client.cookie
  );
  await call(
    authenticated,
    base + "/client-deliverables",
    "GET",
    undefined,
    403,
    users.outsider.cookie
  );
  const campaign = await call(
    authenticated,
    base + "/studio/campaigns",
    "POST",
    {
      name: "Manager campaign",
      objectives: "Tester les permissions",
      brief: "Une création sans chiffres inventés.",
    },
    201,
    users.manager.cookie
  );
  const copy = await call(
    authenticated,
    base + `/studio/campaigns/${campaign.id}/copy`,
    "POST",
    {
      channel: "website",
      title: "Texte à relire",
      body: "TODO : une croissance de 200% garantie.",
    },
    201,
    users.creative.cookie
  );
  await call(
    authenticated,
    base + `/studio/campaigns/${campaign.id}/copy/${copy.id}/decision`,
    "POST",
    { decision: "approved" },
    403,
    users.creative.cookie
  );
  await call(
    authenticated,
    base + `/studio/campaigns/${campaign.id}/copy/${copy.id}/decision`,
    "POST",
    { decision: "approved" },
    422,
    users.manager.cookie
  );
  const copies = await admin(base + `/studio/campaigns/${campaign.id}/copy`);
  assert.ok(
    copies[0].quality.findings.some((f) => f.code === "unsupported_numbers")
  );
  await call(
    authenticated,
    base + `/studio/campaigns/${campaign.id}/copy/${copy.id}/decision`,
    "POST",
    {
      decision: "approved",
      note: "Fixture de vérification explicite, ne pas publier.",
    },
    200,
    users.manager.cookie
  );
  const delivered = await call(
    authenticated,
    base + "/client-deliverables",
    "GET",
    undefined,
    200,
    users.client.cookie
  );
  assert.equal(delivered.texts.length, 1);
  await admin(gov, "PUT", {
    requireAgentPolicy: true,
    maxAgentRuns: 1,
    maxVideoRuns: 1,
    artifactRetentionDays: 30,
  });
  const checkpoint = {
    summary: "Préparation enregistrée avant interruption.",
    output: {
      completed: ["prepare_completed"],
      nextActions: ["finish_report"],
      notes: "Point de reprise de vérification.",
    },
  };
  const program = `const fs=require('fs');const secret=process.env.DEMO_SECRET;process.stdout.write(secret.slice(0,6));setTimeout(()=>{process.stdout.write(secret.slice(6)+'\\n');if(!fs.existsSync('/workspace/prepared')){fs.writeFileSync('/workspace/prepared','once');console.log('SORAVYN_CHECKPOINT:'+JSON.stringify(${JSON.stringify(
    checkpoint
  )}));process.exit(1);}let data='';process.stdin.on('data',x=>data+=x);process.stdin.on('end',()=>{const body=JSON.parse(data);if(!body.recoveryCheckpoint.output.completed.includes('prepare_completed'))process.exit(7);let protectedRoot=false;try{fs.writeFileSync('/etc/agent-test','no');}catch{protectedRoot=true;}if(!protectedRoot||fs.existsSync('/home/adlane'))process.exit(9);console.log('Recovered once; host files unavailable; root filesystem read-only.');});},20);`;
  const agent = await admin(
    base + "/agents",
    "POST",
    {
      name: "Isolated checkpoint agent",
      adapterType: "process",
      adapterConfig: {
        command: "/usr/local/bin/node",
        args: ["-e", program],
        env: { DEMO_SECRET: "fixture-sensitive-value" },
        timeoutSec: 20,
      },
      runtimeConfig: { heartbeat: { enabled: false } },
      budgetMonthlyCents: 1000,
    },
    201
  );
  const denied = await admin(
    `/agents/${agent.id}/heartbeat/invoke`,
    "POST",
    {},
    202
  );
  const deniedResult = await waitRun(denied.id, cid);
  assert.equal(deniedResult.status, "failed");
  assert.ok(deniedResult.error.includes("policy"));
  await admin(gov + `/agents/${agent.id}/policy`, "PUT", {
    mode: "isolated_process",
    allowedAdapters: ["process"],
    allowedCommands: ["/usr/local/bin/node"],
    allowedEnvKeys: ["DEMO_SECRET"],
    workspaceWritable: true,
    timeoutSec: 20,
    cpu: 1,
    memoryMb: 256,
  });
  await admin(`/agents/${agent.id}`, "PATCH", { status: "idle" });
  const task = await admin(
    base + "/issues",
    "POST",
    {
      title: "Recover isolated task",
      description: "Persist progress and resume under human control.",
      assigneeAgentId: agent.id,
      status: "backlog",
    },
    201
  );
  const wake = await admin(
    `/agents/${agent.id}/wakeup`,
    "POST",
    {
      source: "on_demand",
      triggerDetail: "manual",
      payload: { issueId: task.id },
    },
    202
  );
  const failed = await waitRun(wake.id, cid);
  assert.equal(failed.status, "failed", JSON.stringify(failed));
  assert.ok(!JSON.stringify(failed).includes("fixture-sensitive-value"));
  const checkpoints = await admin(`/issues/${task.id}/checkpoints`);
  assert.equal(checkpoints.length, 1);
  assert.equal(checkpoints[0].output.completed[0], "prepare_completed");
  const recovery = await admin(
    `/issues/${task.id}/recovery`,
    "POST",
    {
      sourceRunId: failed.id,
      confirmExternalEffectsReviewed: true,
      confirmConfiguredModelCosts: true,
    },
    201
  );
  assert.ok(recovery.newRunId, JSON.stringify(recovery));
  const completed = await waitRun(recovery.newRunId, cid);
  assert.equal(completed.status, "succeeded", JSON.stringify(completed));
  assert.ok(completed.stdoutExcerpt.includes("Recovered once"));
  assert.ok(!JSON.stringify(completed).includes("fixture-sensitive-value"));
  await admin(
    `/issues/${task.id}/recovery`,
    "POST",
    {
      sourceRunId: failed.id,
      confirmExternalEffectsReviewed: true,
      confirmConfiguredModelCosts: true,
    },
    409
  );
  const budgetAgent = await admin(
    base + "/agents",
    "POST",
    {
      name: "Budget guard agent",
      adapterType: "process",
      adapterConfig: { command: "/usr/bin/true" },
      runtimeConfig: { heartbeat: { enabled: false } },
      budgetMonthlyCents: 1000,
    },
    201
  );
  await admin(gov + `/agents/${budgetAgent.id}/policy`, "PUT", {
    mode: "isolated_process",
    allowedAdapters: ["process"],
    allowedCommands: ["/usr/bin/true"],
    timeoutSec: 10,
  });
  const budgetTask = await admin(
    base + "/issues",
    "POST",
    {
      title: "Budget guarded task",
      assigneeAgentId: budgetAgent.id,
      status: "backlog",
      billingCode: `campaign:${campaign.id}`,
    },
    201
  );
  await admin(base + `/studio/campaigns/${campaign.id}/budget`, "PUT", {
    limitCents: 100,
  });
  const bypass = await admin(
    `/agents/${budgetAgent.id}/wakeup`,
    "POST",
    {
      source: "on_demand",
      triggerDetail: "manual",
      payload: { issueId: budgetTask.id },
    },
    202
  );
  const blocked = await waitRun(bypass.id, cid);
  assert.equal(blocked.status, "failed");
  assert.ok(blocked.error.includes("reservation"), JSON.stringify(blocked));
  const operations = await admin(gov + "/operations");
  assert.equal(operations.activeAgentPermits, 0);
  await writeFile(
    "/tmp/soravyn-governance-browser-accounts.json",
    JSON.stringify(
      {
        origin: authenticated,
        companyId: cid,
        prefix: company.issuePrefix,
        users,
      },
      null,
      2
    ),
    { mode: 0o600 }
  );
  const proof = {
    passed: true,
    companyId: cid,
    campaignId: campaign.id,
    agentId: agent.id,
    taskId: task.id,
    sourceRunId: failed.id,
    recoveryRunId: completed.id,
    checks: [
      "real BetterAuth signup and sessions for four users",
      "signups do not become instance administrators",
      "client cannot access agents or another workspace",
      "manager cannot administer workspace governance",
      "creative cannot approve copy",
      "unfinished copy requires explicit override note",
      "advisory unsupported-claim detection",
      "missing agent policy blocks execution",
      "real isolated command with read-only host root and dedicated workspace",
      "structured checkpoint saved before failure",
      "human-authorized task recovery receives checkpoint over stdin",
      "duplicate recovery rejected",
      "known secret removed from persisted output",
      "campaign budget guard blocks generic wakeup bypass",
      "execution permits released",
    ],
    externalPublication: false,
  };
  await writeFile(
    "/tmp/soravyn-governance-proof.json",
    JSON.stringify(proof, null, 2)
  );
  console.log(JSON.stringify(proof, null, 2));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
