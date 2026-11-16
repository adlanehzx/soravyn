import {
  prepareFlowAgent,
  waitFlowAgentResult,
  downloadFlowAgent,
} from "./services/flow-agent-browser.js";
import { chromium, type Page } from "playwright-core";
import { and, eq, lt, inArray, sql } from "drizzle-orm";
import { createDb, flowJobs } from "@soravyn/db";
import {
  readFile,
  mkdir,
  writeFile,
  rename,
  rm,
  stat,
  chmod,
} from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { loadConfig } from "./config.js";
import { resolveEmbeddedIdentity } from "./legacy-database-compat.js";
import {
  flowRecipe,
  flowDirectory,
  checkedPrice,
} from "./services/flow-contract.js";
import { z } from "zod";
const execute = promisify(execFile),
  config = loadConfig();
let port = config.embeddedPostgresPort;
if (!config.databaseUrl) {
  try {
    port = Number(
      (
        await readFile(
          join(config.embeddedPostgresDataDir, "postmaster.pid"),
          "utf8"
        )
      ).split("\n")[3]
    );
  } catch {}
}
const db = createDb(
  config.databaseUrl || (await resolveEmbeddedIdentity(port)).connectionUrl
);
const companyIndex = process.argv.indexOf("--company");
const companyId = z
  .string()
  .uuid()
  .parse(process.argv[companyIndex + 1]);
if (companyIndex < 0)
  throw new Error("--company UUID required; one browser profile per client");
const root = resolve(flowDirectory(companyId));
await mkdir(root, { recursive: true, mode: 0o700 });
await chmod(root, 0o700);
const lock = join(root, "browser.lock");
await mkdir(lock, { mode: 0o700 }).catch(() => {
  throw new Error(
    "Flow profile locked. Stop the other worker/login; inspect abandoned jobs before removing browser.lock."
  );
});
let stopping = false;
let closeBrowser: (() => Promise<void>) | undefined;
process.on("SIGTERM", () => {
  stopping = true;
  void closeBrowser?.();
});
process.on("SIGINT", () => {
  stopping = true;
  void closeBrowser?.();
});
async function browser() {
  const context = await chromium.launchPersistentContext(
    join(root, "profile"),
    {
      executablePath: process.env.SORAVYN_FLOW_CHROMIUM || "/usr/bin/chromium",
      headless: process.env.SORAVYN_FLOW_HEADLESS === "true",
      acceptDownloads: true,
      viewport: { width: 1280, height: 900 },
    }
  );
  closeBrowser = () => context.close();
  return context;
}
async function blocked(page: Page, selectors: string[]) {
  if (
    !["flow.google.com", "labs.google"].includes(new URL(page.url()).hostname)
  )
    return true;
  for (const selector of [
    "input[type=password]",
    'iframe[src*="recaptcha"]',
    ...selectors,
  ])
    if (
      await page
        .locator(selector)
        .first()
        .isVisible()
        .catch(() => false)
    )
      return true;
  return false;
}
async function once() {
  // Never repeat a potentially billed action after a crash, even if the lease expired before the click.
  await db
    .update(flowJobs)
    .set({
      status: "needs_attention",
      stage: "submission_uncertain",
      message:
        "Worker interrompu : vérifier Flow avant toute nouvelle génération.",
      leaseToken: null,
      leaseUntil: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(flowJobs.companyId, companyId),
        inArray(flowJobs.status, ["running", "submitted"]),
        lt(flowJobs.leaseUntil, new Date())
      )
    );
  const token = randomUUID();
  const job = await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`soravyn:flow:${companyId}`}))`
    );
    const [active] = await tx
      .select({ id: flowJobs.id })
      .from(flowJobs)
      .where(
        and(
          eq(flowJobs.companyId, companyId),
          inArray(flowJobs.status, ["running", "submitted"])
        )
      );
    if (active) return null;
    const [row] = await tx
      .select()
      .from(flowJobs)
      .where(
        and(eq(flowJobs.companyId, companyId), eq(flowJobs.status, "queued"))
      )
      .orderBy(flowJobs.createdAt)
      .limit(1)
      .for("update", { skipLocked: true });
    if (!row) return null;
    const [claimed] = await tx
      .update(flowJobs)
      .set({
        status: "running",
        stage: "before_submission",
        leaseToken: token,
        leaseUntil: new Date(Date.now() + 20 * 60_000),
        updatedAt: new Date(),
      })
      .where(eq(flowJobs.id, row.id))
      .returning();
    return claimed;
  });
  if (!job) return false;
  const owner = and(eq(flowJobs.id, job.id), eq(flowJobs.leaseToken, token));
  let submitted = false;
  let context: Awaited<ReturnType<typeof browser>> | undefined;
  const stage = async (name: string) => {
    await db
      .update(flowJobs)
      .set({
        stage: name,
        events: sql`${flowJobs.events} || ${JSON.stringify([
          { stage: name, at: new Date().toISOString() },
        ])}::jsonb`,
        updatedAt: new Date(),
      })
      .where(owner);
  };
  try {
    const recipe = flowRecipe.parse(
      JSON.parse(await readFile(join(root, "recipe.json"), "utf8"))
    );
    if (Date.now() - Date.parse(recipe.reviewedAt) > 7 * 86400000)
      throw new Error("CALIBRATION_EXPIRED");
    context = await browser();
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(recipe.projectUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    if (await blocked(page, recipe.blockers))
      throw new Error("HUMAN_LOGIN_OR_CHALLENGE");
    const agentMode = recipe.mode === "agent_confirmation";
    let credits: number;
    let downloads: ReturnType<Page["locator"]> | undefined;
    let approve: ReturnType<Page["locator"]> | undefined;
    if (agentMode) {
      const prepared = await prepareFlowAgent(
        page,
        job.prompt,
        job.maxCredits,
        recipe.model
      );
      credits = prepared.credits;
      approve = prepared.approve;
      await stage("agent_permission_verified");
    } else {
      await page.locator(recipe.ready).waitFor({ state: "visible" });
      if (
        (await page.locator(recipe.settings).innerText()).trim() !==
        recipe.settingsText.trim()
      )
        throw new Error("SETTINGS_CHANGED");
      downloads = page.locator(recipe.download);
      if (await downloads.count())
        throw new Error("PROJECT_MUST_HAVE_NO_EXISTING_DOWNLOADS");
      await page.locator(recipe.prompt).fill(job.prompt);
      await stage("prompt_prepared");
      if (await blocked(page, recipe.blockers))
        throw new Error("HUMAN_LOGIN_OR_CHALLENGE");
      const price = await page.locator(recipe.price).innerText();
      credits = checkedPrice(
        price,
        recipe.priceText,
        recipe.credits,
        job.maxCredits
      );
    }
    // Persist possible spend BEFORE click. Network errors after this point never cause an automatic resubmission.
    const [armed] = await db
      .update(flowJobs)
      .set({
        status: "submitted",
        stage: "submission_armed",
        submittedAt: new Date(),
        observedCredits: credits,
        updatedAt: new Date(),
      })
      .where(and(owner, eq(flowJobs.status, "running")))
      .returning();
    if (!armed) throw new Error("LEASE_LOST");
    submitted = true;
    if (agentMode) {
      await approve!.click();
    } else {
      await page
        .locator(recipe.submit)
        .click({ timeout: 15000, noWaitAfter: true });
    }
    await stage("waiting_for_download");
    const deadline = Date.now() + 15 * 60_000;
    let ready = false;
    while (!stopping && Date.now() < deadline) {
      if (await blocked(page, recipe.blockers))
        throw new Error("HUMAN_LOGIN_OR_CHALLENGE");
      if (
        agentMode
          ? await waitFlowAgentResult(page)
          : (await downloads!.count()) === 1 && (await downloads!.isVisible())
      ) {
        ready = true;
        break;
      }
      if (!agentMode && (await downloads!.count()) > 1)
        throw new Error("AMBIGUOUS_RESULT");
      await new Promise((r) => setTimeout(r, 2000));
    }
    if (!ready) throw new Error("RESULT_NOT_READY");
    const folder = join(root, "jobs", job.id);
    await mkdir(folder, { recursive: true, mode: 0o700 });
    const partial = join(folder, "download.partial");
    const download = agentMode
      ? await downloadFlowAgent(page)
      : (
          await Promise.all([
            page.waitForEvent("download", { timeout: 60000 }),
            downloads!.click(),
          ])
        )[0];
    await download.saveAs(partial);
    if (await download.failure()) throw new Error("DOWNLOAD_FAILED");
    const size = (await stat(partial)).size;
    if (size < 100 || size > 256 * 1024 * 1024)
      throw new Error("INVALID_VIDEO_SIZE");
    const probe = JSON.parse(
      (
        await execute(
          "ffprobe",
          [
            "-v",
            "error",
            "-show_streams",
            "-show_format",
            "-of",
            "json",
            partial,
          ],
          { timeout: 30000, maxBuffer: 1024 * 1024 }
        )
      ).stdout
    );
    if (
      !probe.streams?.some(
        (s: { codec_type: string }) => s.codec_type === "video"
      ) ||
      Number(probe.format?.duration) <= 0
    )
      throw new Error("INVALID_VIDEO");
    await rename(partial, join(folder, "output.mp4"));
    await writeFile(
      join(folder, "report.json"),
      JSON.stringify({
        source: "google-flow-browser",
        jobId: job.id,
        observedAuthorizationCredits: credits,
        actualBilledCredits: "not available",
        duration: probe.format.duration,
      }),
      { mode: 0o600 }
    );
    await stage("video_verified");
    await db
      .update(flowJobs)
      .set({
        status: "succeeded",
        stage: "ready_for_review",
        message: null,
        leaseToken: null,
        leaseUntil: null,
        updatedAt: new Date(),
      })
      .where(owner);
  } catch (error) {
    const code =
      error instanceof Error && /^[A-Z_]+$/.test(error.message)
        ? error.message
        : "FLOW_REQUIRES_ATTENTION";
    await db
      .update(flowJobs)
      .set({
        status: "needs_attention",
        stage: submitted ? "submission_uncertain" : "before_submission",
        message: code,
        leaseToken: null,
        leaseUntil: null,
        updatedAt: new Date(),
      })
      .where(owner);
    process.stdout.write(
      `Flow job ${job.id}: needs human attention (${code})\n`
    );
  } finally {
    await context?.close().catch(() => {});
    closeBrowser = undefined;
  }
  return true;
}
try {
  if (process.argv.includes("--login")) {
    // Authentication is manual in a normal browser, without an automation or CDP session.
    const child = spawn(
      process.env.SORAVYN_FLOW_CHROMIUM || "/usr/bin/chromium",
      [
        `--user-data-dir=${join(root, "profile")}`,
        "--new-window",
        "https://flow.google.com/",
      ],
      { stdio: "ignore" }
    );
    closeBrowser = async () => {
      child.kill("SIGTERM");
    };
    console.log(
      "Connexion manuelle dans Chromium standard. Connectez-vous puis fermez cette fenêtre. Aucun mot de passe ou cookie n’est exporté."
    );
    await new Promise<void>((resolve, reject) => {
      child.once("error", () =>
        reject(new Error("Cannot launch the configured Chromium browser"))
      );
      child.once("exit", (code) =>
        code === 0 || stopping
          ? resolve()
          : reject(new Error("Login browser closed unexpectedly"))
      );
    });
    closeBrowser = undefined;
  } else {
    if (process.env.SORAVYN_FLOW_ENABLED !== "true")
      throw new Error(
        "Enable explicitly with SORAVYN_FLOW_ENABLED=true after reviewing Flow terms and calibrating the UI."
      );
    while (!stopping) {
      await once();
      if (process.argv.includes("--once")) break;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
} finally {
  await closeBrowser?.().catch(() => {});
  await rm(lock, { recursive: true, force: true });
  process.exitCode = 0;
}
await (
  db as unknown as { $client?: { end: () => Promise<void> } }
).$client?.end();
process.exit(0);
