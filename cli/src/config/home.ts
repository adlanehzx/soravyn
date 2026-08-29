import fs from "node:fs";
import { applyLegacyEnvironment, LEGACY_HOME_NAMES } from "@soravyn/shared";
import os from "node:os";
import path from "node:path";

const DEFAULT_INSTANCE_ID = "default";
const INSTANCE_ID_RE = /^[a-zA-Z0-9_-]+$/;

export function resolveSoravynHomeDir(): string {
  applyLegacyEnvironment(process.env);
  const envHome = process.env.SORAVYN_HOME?.trim();
  if (envHome) return path.resolve(expandHomePrefix(envHome));
  const home=path.resolve(os.homedir(),".soravyn");
  if(!fs.existsSync(home)){for(const name of LEGACY_HOME_NAMES){const legacy=path.resolve(os.homedir(),name);if(fs.existsSync(path.join(legacy,"instances")))return legacy;}}
  return home;
}

export function resolveSoravynInstanceId(override?: string): string {
  const raw = override?.trim() || process.env.SORAVYN_INSTANCE_ID?.trim() || DEFAULT_INSTANCE_ID;
  if (!INSTANCE_ID_RE.test(raw)) {
    throw new Error(
      `Invalid instance id '${raw}'. Allowed characters: letters, numbers, '_' and '-'.`,
    );
  }
  return raw;
}

export function resolveSoravynInstanceRoot(instanceId?: string): string {
  const id = resolveSoravynInstanceId(instanceId);
  return path.resolve(resolveSoravynHomeDir(), "instances", id);
}

export function resolveDefaultConfigPath(instanceId?: string): string {
  return path.resolve(resolveSoravynInstanceRoot(instanceId), "config.json");
}

export function resolveDefaultContextPath(): string {
  return path.resolve(resolveSoravynHomeDir(), "context.json");
}

export function resolveDefaultEmbeddedPostgresDir(instanceId?: string): string {
  return path.resolve(resolveSoravynInstanceRoot(instanceId), "db");
}

export function resolveDefaultLogsDir(instanceId?: string): string {
  return path.resolve(resolveSoravynInstanceRoot(instanceId), "logs");
}

export function resolveDefaultSecretsKeyFilePath(instanceId?: string): string {
  return path.resolve(resolveSoravynInstanceRoot(instanceId), "secrets", "master.key");
}

export function resolveDefaultStorageDir(instanceId?: string): string {
  return path.resolve(resolveSoravynInstanceRoot(instanceId), "data", "storage");
}

export function resolveDefaultBackupDir(instanceId?: string): string {
  return path.resolve(resolveSoravynInstanceRoot(instanceId), "data", "backups");
}

export function expandHomePrefix(value: string): string {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.resolve(os.homedir(), value.slice(2));
  return value;
}

export function describeLocalInstancePaths(instanceId?: string) {
  const resolvedInstanceId = resolveSoravynInstanceId(instanceId);
  const instanceRoot = resolveSoravynInstanceRoot(resolvedInstanceId);
  return {
    homeDir: resolveSoravynHomeDir(),
    instanceId: resolvedInstanceId,
    instanceRoot,
    configPath: resolveDefaultConfigPath(resolvedInstanceId),
    embeddedPostgresDataDir: resolveDefaultEmbeddedPostgresDir(resolvedInstanceId),
    backupDir: resolveDefaultBackupDir(resolvedInstanceId),
    logDir: resolveDefaultLogsDir(resolvedInstanceId),
    secretsKeyFilePath: resolveDefaultSecretsKeyFilePath(resolvedInstanceId),
    storageDir: resolveDefaultStorageDir(resolvedInstanceId),
  };
}
