import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { readFile, mkdir, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { loadConfig } from "../../server/src/config.js";
import { resolveEmbeddedIdentity } from "../../server/src/legacy-database-compat.js";
import { runDatabaseBackup } from "../../packages/db/src/backup-lib.js";
const require = createRequire(
  new URL("../../packages/db/package.json", import.meta.url)
);
const postgres =
  require("postgres") as typeof import("../../packages/db/node_modules/postgres/types/index.js").default;
const config = loadConfig();
let port = config.embeddedPostgresPort;
if (!config.databaseUrl) {
  const pid = await readFile(
    join(config.embeddedPostgresDataDir, "postmaster.pid"),
    "utf8"
  );
  port = Number(pid.split("\n")[3]);
}
const url =
  config.databaseUrl || (await resolveEmbeddedIdentity(port)).connectionUrl;
const source = postgres(url, { max: 1 });
const name = "soravyn_restore_verify_" + randomUUID().replaceAll("-", "");
let restored: ReturnType<typeof postgres> | undefined;
try {
  const sourceVersion = await source`select version()`;
  await mkdir("/tmp/soravyn-backup-verification", {
    recursive: true,
    mode: 0o700,
  });
  const backup = await runDatabaseBackup({
    connectionString: url,
    backupDir: "/tmp/soravyn-backup-verification",
    retentionDays: 1,
    filenamePrefix: "restore-verification",
  });
  assert.equal((await stat(backup.backupFile)).mode & 0o777, 0o600);
  await source.unsafe(`create database "${name}"`);
  const target = new URL(url);
  target.pathname = "/" + name;
  restored = postgres(target.toString(), { max: 1 });
  const connection = new URL(url);
  await promisify(execFile)(
    process.env.SORAVYN_PSQL_PATH || "psql",
    ["--no-password", "--set", "ON_ERROR_STOP=1", "--file", backup.backupFile],
    {
      timeout: 180000,
      maxBuffer: 1024 * 1024,
      env: {
        ...process.env,
        PGHOST: connection.hostname,
        PGPORT: connection.port || "5432",
        PGUSER: decodeURIComponent(connection.username),
        PGPASSWORD: decodeURIComponent(connection.password),
        PGDATABASE: name,
      },
    }
  );
  const proof = JSON.parse(
    await readFile("/tmp/soravyn-governance-proof.json", "utf8")
  );
  const [company] =
    await restored`select id,name from companies where id=${proof.companyId}`;
  assert.ok(company);
  const [checkpoint] =
    await restored`select count(*)::int as n from task_checkpoints where company_id=${proof.companyId}`;
  assert.ok(checkpoint.n > 0);
  const [roles] =
    await restored`select count(*)::int as n from company_memberships where company_id=${proof.companyId}`;
  assert.ok(roles.n >= 3);
  const constraints =
    await restored`select count(*)::int as n from pg_constraint where connamespace='public'::regnamespace`;
  const indexes =
    await restored`select count(*)::int as n from pg_indexes where schemaname='public'`;
  const originalConstraints =
    await source`select count(*)::int as n from pg_constraint where connamespace='public'::regnamespace`;
  const originalIndexes =
    await source`select count(*)::int as n from pg_indexes where schemaname='public'`;
  assert.equal(constraints[0].n, originalConstraints[0].n);
  assert.equal(indexes[0].n, originalIndexes[0].n);
  const [journal] =
    await restored`select count(*)::int as n from drizzle.__drizzle_migrations`;
  assert.ok(journal.n > 0);
  const result = {
    passed: true,
    backupBytes: backup.sizeBytes,
    constraintCount: constraints[0].n,
    indexCount: indexes[0].n,
    checkpointCount: checkpoint.n,
    membersRestored: roles.n,
    migrationJournalRows: journal.n,
    client: "native pg_dump",
    serverVersion: sourceVersion[0].version,
    checks: [
      "consistent native dump",
      "private backup file permissions",
      "restore into a separate temporary database",
      "company checkpoint and role data restored",
      "constraints and indexes retained",
      "migration journal retained",
    ],
    sourceDatabaseModified: false,
  };
  await writeFile(
    "/tmp/soravyn-backup-restore-proof.json",
    JSON.stringify(result, null, 2)
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  if (restored) await restored.end();
  await source.unsafe(`drop database if exists "${name}" with (force)`);
  await source.end();
}
