import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
const origin = process.env.SORAVYN_TEST_URL || "http://127.0.0.1:3207";
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
const a = await call(
    "/companies",
    "POST",
    { name: "Flow connector verification" },
    201
  ),
  b = await call(
    "/companies",
    "POST",
    { name: "Flow isolation verification" },
    201
  );
const base = `/companies/${a.id}`;
const campaign = await call(
  base + "/studio/campaigns",
  "POST",
  {
    name: "Flow verification",
    brief: "No paid generation",
    objectives: "Check queue and fail-closed browser admission",
  },
  201
);
const body = {
  campaignId: campaign.id,
  prompt: "A cinematic presentation of a fictional product.",
  maxCredits: 20,
  confirmCreditSpend: true,
};
await call(`/companies/${b.id}/video/flow`, "POST", body, 404);
await call(
  base + "/video/flow",
  "POST",
  { ...body, confirmCreditSpend: false },
  400
);
const job = await call(base + "/video/flow", "POST", body, 201);
const worker = spawnSync("pnpm", ["flow:worker", "--company", a.id, "--once"], {
  env: { ...process.env, SORAVYN_FLOW_ENABLED: "true" },
  timeout: 60000,
  encoding: "utf8",
});
assert.equal(worker.status, 0, worker.stderr);
const rows = await call(base + "/video/flow");
const paused = rows.find((x) => x.id === job.id);
assert.equal(paused.status, "needs_attention");
assert.equal(paused.stage, "before_submission");
assert.equal(paused.submittedAt, null);
assert.equal(paused.observedCredits, null);
await call(
  `/companies/${b.id}/video/flow/${job.id}/video`,
  "GET",
  undefined,
  404
);
await call(base + `/video/flow/${job.id}/resume`, "POST", {
  confirmNoGenerationSubmitted: true,
});
await call(base + `/video/flow/${job.id}/cancel`, "POST", {});
const cancelled = (await call(base + "/video/flow")).find(
  (x) => x.id === job.id
);
assert.equal(cancelled.status, "cancelled");
const proof = {
  passed: true,
  checks: [
    "persistent queue",
    "cross-client campaign reference rejected",
    "explicit credit consent required",
    "worker pauses before browser launch without calibrated recipe",
    "no credit submission recorded",
    "cross-client video inaccessible",
    "pre-submission resume and queued cancellation persisted",
  ],
  realGoogleGeneration: false,
  reason: "Google login and authenticated UI calibration pending",
};
await writeFile(
  "doc/verification/flow-connector.json",
  JSON.stringify(proof, null, 2) + "\n"
);
console.log(JSON.stringify(proof, null, 2));
