// Operator-only reconciliation: import a clip already generated in Flow, never generate again.
import {
  readFile,
  mkdir,
  copyFile,
  rename,
  writeFile,
  stat,
} from "node:fs/promises";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID, createHash } from "node:crypto";
import { createDb, flowJobs } from "@soravyn/db";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { loadConfig } from "./config.js";
import { resolveEmbeddedIdentity } from "./legacy-database-compat.js";
import { flowDirectory } from "./services/flow-contract.js";
const run = promisify(execFile);
function arg(name: string) {
  const i = process.argv.indexOf(name);
  if (i < 0 || !process.argv[i + 1]) throw new Error(`${name} required`);
  return process.argv[i + 1];
}
const companyId = z.string().uuid().parse(arg("--company")),
  id = z.string().uuid().parse(arg("--job")),
  file = resolve(arg("--file"));
const credits = z.coerce
  .number()
  .int()
  .min(1)
  .max(1000)
  .parse(arg("--observed-credits"));
const config = loadConfig();
let port = config.embeddedPostgresPort;
if (!config.databaseUrl)
  port = Number(
    (
      await readFile(
        join(config.embeddedPostgresDataDir, "postmaster.pid"),
        "utf8"
      )
    ).split("\n")[3]
  );
const db = createDb(
  config.databaseUrl || (await resolveEmbeddedIdentity(port)).connectionUrl
);
const [job] = await db
  .select()
  .from(flowJobs)
  .where(and(eq(flowJobs.companyId, companyId), eq(flowJobs.id, id)));
if (
  !job ||
  !["cancelled", "needs_attention"].includes(job.status) ||
  credits > job.maxCredits
)
  throw new Error(
    "Import requires a stopped job in this company with sufficient credit authorization"
  );
const bytes = (await stat(file)).size;
if (bytes < 100 || bytes > 256 * 1024 * 1024)
  throw new Error("Invalid video size");
const probe = JSON.parse(
  (
    await run(
      "ffprobe",
      ["-v", "error", "-show_streams", "-show_format", "-of", "json", file],
      { timeout: 30000, maxBuffer: 1024 * 1024 }
    )
  ).stdout
);
if (
  !probe.streams.some(
    (s: { codec_type: string }) => s.codec_type === "video"
  ) ||
  !String(probe.format.format_name).includes("mp4") ||
  Number(probe.format.duration) <= 0
)
  throw new Error("Valid MP4 required");
await run("ffmpeg", ["-v", "error", "-i", file, "-f", "null", "-"], {
  timeout: 60000,
  maxBuffer: 1024 * 1024,
});
const folder = join(flowDirectory(companyId), "jobs", id);
await mkdir(folder, { recursive: true, mode: 0o700 });
const staged = join(folder, `.import-${randomUUID()}.mp4`);
await copyFile(file, staged);
const sha256 = createHash("sha256")
  .update(await readFile(staged))
  .digest("hex");
const proof = {
  source: "google-flow-browser",
  jobId: id,
  campaignId: job.campaignId,
  imported: true,
  observedApprovalCredits: credits,
  actualBilledCredits: "not independently reconciled",
  duration: Number(probe.format.duration),
  width: probe.streams.find(
    (s: { codec_type: string }) => s.codec_type === "video"
  ).width,
  height: probe.streams.find(
    (s: { codec_type: string }) => s.codec_type === "video"
  ).height,
  codecs: probe.streams.map((s: { codec_name: string }) => s.codec_name),
  bytes,
  sha256,
  fullDecodePassed: true,
  at: new Date().toISOString(),
};
await db.transaction(async (tx) => {
  const [current] = await tx
    .select()
    .from(flowJobs)
    .where(
      and(
        eq(flowJobs.id, id),
        eq(flowJobs.companyId, companyId),
        inArray(flowJobs.status, ["cancelled", "needs_attention"])
      )
    )
    .for("update");
  if (!current) throw new Error("Job state changed; import stopped");
  await rename(staged, join(folder, "output.mp4"));
  await writeFile(join(folder, "report.json"), JSON.stringify(proof, null, 2), {
    mode: 0o600,
  });
  await tx
    .update(flowJobs)
    .set({
      status: "succeeded",
      stage: "imported_ready_for_review",
      observedCredits: credits,
      message:
        "Imported from the single human-authorized Flow generation; no new generation requested.",
      leaseToken: null,
      leaseUntil: null,
      updatedAt: new Date(),
      events: [
        ...current.events,
        { stage: "operator_import_verified", at: new Date().toISOString() },
      ],
    })
    .where(eq(flowJobs.id, id));
});
console.log(JSON.stringify(proof, null, 2));
process.exit(0);
