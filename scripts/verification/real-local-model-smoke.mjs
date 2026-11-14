import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
const origin = process.env.SORAVYN_TEST_URL || "http://127.0.0.1:3206";
const model = process.env.SORAVYN_OLLAMA_MODEL || "qwen2.5:1.5b";
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
const version = await (
  await fetch("http://127.0.0.1:11434/api/version")
).json();
const catalog = await (await fetch("http://127.0.0.1:11434/api/tags")).json();
const installed = catalog.models.find((m) => m.name === model);
assert.ok(installed, "Install the real local model first");
const company = await call(
  "/companies",
  "POST",
  { name: "Real local model verification" },
  201
);
const base = `/companies/${company.id}/studio`;
await call(base + "/brand", "PUT", {
  name: "Atelier Rendez-vous",
  description: "Application de prise de rendez-vous pour petites entreprises.",
  audience: "Petites entreprises",
  tone: "Simple, précis, sans promesses chiffrées",
  languages: ["fr"],
  editorialRules:
    "Ne pas inventer de clients, de performances ou de résultats.",
});
const campaign = await call(
  base + "/campaigns",
  "POST",
  {
    name: "Présentation de notre application",
    objectives: "Expliquer simplement la prise de rendez-vous",
    brief:
      "Présenter une application de prise de rendez-vous. Ne pas inventer de prix, de chiffres ou de témoignages. Deux scènes courtes suffisent.",
  },
  201
);
const job = await call(
  base + `/campaigns/${campaign.id}/creative-packs`,
  "POST",
  { platform: "square" },
  201
);
const started = Date.now();
const child = spawn(
  "pnpm",
  [
    "--filter",
    "@soravyn/server",
    "exec",
    "tsx",
    "src/video-worker.ts",
    "--once",
  ],
  {
    env: {
      ...process.env,
      SORAVYN_OLLAMA_MODEL: model,
      SORAVYN_OLLAMA_URL: "http://127.0.0.1:11434",
      SORAVYN_VIDEO_COMPANY_ID: company.id,
    },
    stdio: ["ignore", "pipe", "pipe"],
  }
);
let output = "";
child.stdout.on("data", (d) => (output += d));
child.stderr.on("data", (d) => (output += d));
const timer = setTimeout(() => child.kill("SIGTERM"), 10 * 60_000);
try {
  const code = await new Promise((resolve) => child.on("exit", resolve));
  assert.equal(code, 0, output);
} finally {
  clearTimeout(timer);
}
const result = await call(`/companies/${company.id}/video/jobs/${job.id}`);
const steps = await call(`/companies/${company.id}/video/jobs/${job.id}/steps`);
const proof = {
  passed: result.status === "script_ready",
  companyId: company.id,
  campaignId: campaign.id,
  jobId: job.id,
  model,
  modelDigest: installed.digest,
  ollamaVersion: version.version,
  elapsedMs: Date.now() - started,
  status: result.status,
  error: result.error,
  stages: steps.map((step) => ({
    stage: step.stage,
    status: step.status,
    attempts: step.attempts,
    errorCode: step.errorCode,
  })),
  copyCount: result.input.pack?.copy?.length || 0,
  mode: "Real local CPU model; no mocked responses and no external provider calls",
  limits:
    "Only structural generation is verified. Editorial truth and commercial usefulness still require human review.",
};
await writeFile(
  "/tmp/soravyn-real-model-proof.json",
  JSON.stringify(proof, null, 2)
);
console.log(JSON.stringify(proof, null, 2));
if (!proof.passed) process.exitCode = 1;
