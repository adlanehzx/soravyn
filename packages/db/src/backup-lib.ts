import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { chmod, rename, unlink, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
const execute = promisify(execFile);
import { resolve } from "node:path";

export type RunDatabaseBackupOptions = {
  connectionString: string;
  backupDir: string;
  retentionDays: number;
  filenamePrefix?: string;
  connectTimeoutSeconds?: number;
};

export type RunDatabaseBackupResult = {
  backupFile: string;
  sizeBytes: number;
  prunedCount: number;
};

function timestamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(
    date.getDate()
  )}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function pruneOldBackups(
  backupDir: string,
  retentionDays: number,
  filenamePrefix: string
): number {
  if (!existsSync(backupDir)) return 0;
  const safeRetention = Math.max(1, Math.trunc(retentionDays));
  const cutoff = Date.now() - safeRetention * 24 * 60 * 60 * 1000;
  let pruned = 0;

  for (const name of readdirSync(backupDir)) {
    if (!name.startsWith(`${filenamePrefix}-`) || !name.endsWith(".sql"))
      continue;
    const fullPath = resolve(backupDir, name);
    const stat = statSync(fullPath);
    if (stat.mtimeMs < cutoff) {
      unlinkSync(fullPath);
      pruned++;
    }
  }

  return pruned;
}

function formatBackupSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes}B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)}K`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)}M`;
}

export async function runDatabaseBackup(
  opts: RunDatabaseBackupOptions
): Promise<RunDatabaseBackupResult> {
  const prefix = opts.filenamePrefix || "soravyn";
  if (!/^[A-Za-z0-9_-]+$/.test(prefix))
    throw new Error("Unsafe backup filename prefix");
  const connection = new URL(opts.connectionString);
  if (!["postgres:", "postgresql:"].includes(connection.protocol))
    throw new Error("Unsupported database URL");
  mkdirSync(opts.backupDir, { recursive: true, mode: 0o700 });
  const backupFile = resolve(
    opts.backupDir,
    `${prefix}-${timestamp()}-${randomUUID().slice(0, 8)}.sql`
  );
  const partial = backupFile + ".partial";
  const env = {
    ...process.env,
    PGHOST: connection.hostname,
    PGPORT: connection.port || "5432",
    PGUSER: decodeURIComponent(connection.username),
    PGPASSWORD: decodeURIComponent(connection.password),
    PGDATABASE: decodeURIComponent(connection.pathname.slice(1)),
    PGCONNECT_TIMEOUT: String(opts.connectTimeoutSeconds || 10),
    ...(connection.searchParams.has("sslmode")
      ? { PGSSLMODE: connection.searchParams.get("sslmode")! }
      : {}),
  };
  try {
    await writeFile(partial, "", { flag: "wx", mode: 0o600 });
    await execute(
      process.env.SORAVYN_PG_DUMP_PATH || "pg_dump",
      [
        "--no-password",
        "--no-owner",
        "--no-privileges",
        "--format=plain",
        "--file",
        partial,
      ],
      { env, timeout: 5 * 60_000, maxBuffer: 64 * 1024 }
    );
    await chmod(partial, 0o600);
    await rename(partial, backupFile);
    return {
      backupFile,
      sizeBytes: statSync(backupFile).size,
      prunedCount: pruneOldBackups(opts.backupDir, opts.retentionDays, prefix),
    };
  } catch {
    await unlink(partial).catch(() => {});
    throw new Error(
      "Database backup failed. Install a compatible pg_dump client and verify the database connection; no incomplete backup was published."
    );
  }
}

export function formatDatabaseBackupResult(
  result: RunDatabaseBackupResult
): string {
  const size = formatBackupSize(result.sizeBytes);
  const pruned =
    result.prunedCount > 0
      ? `; pruned ${result.prunedCount} old backup(s)`
      : "";
  return `${result.backupFile} (${size}${pruned})`;
}
