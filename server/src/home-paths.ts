import { applyLegacyEnvironment, LEGACY_HOME_NAMES } from "@soravyn/shared";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DEFAULT_INSTANCE_ID = "default";
const INSTANCE_ID_RE = /^[a-zA-Z0-9_-]+$/;
const PATH_SEGMENT_RE = /^[a-zA-Z0-9_-]+$/;

function expandHomePrefix(value: string): string {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.resolve(os.homedir(), value.slice(2));
  return value;
}

export function resolveSoravynHomeDir(): string {
  applyLegacyEnvironment(process.env);
  const envHome = process.env.SORAVYN_HOME?.trim();
  if (envHome) return path.resolve(expandHomePrefix(envHome));
  const home = path.resolve(os.homedir(), ".soravyn");
  if(!fs.existsSync(home)){
    for(const name of LEGACY_HOME_NAMES){const legacy=path.resolve(os.homedir(),name);if(fs.existsSync(path.join(legacy,"instances")))return legacy;}
  }
  return home;
}

export function resolveSoravynInstanceId(): string {
  const raw = process.env.SORAVYN_INSTANCE_ID?.trim() || DEFAULT_INSTANCE_ID;
  if (!INSTANCE_ID_RE.test(raw)) {
    throw new Error(`Invalid SORAVYN_INSTANCE_ID '${raw}'.`);
  }
  return raw;
}

export function resolveSoravynInstanceRoot(): string {
  return path.resolve(resolveSoravynHomeDir(), "instances", resolveSoravynInstanceId());
}

export function resolveDefaultConfigPath(): string {
  return path.resolve(resolveSoravynInstanceRoot(), "config.json");
}

export function resolveDefaultEmbeddedPostgresDir(): string {
  return path.resolve(resolveSoravynInstanceRoot(), "db");
}

export function resolveDefaultLogsDir(): string {
  return path.resolve(resolveSoravynInstanceRoot(), "logs");
}

export function resolveDefaultSecretsKeyFilePath(): string {
  return path.resolve(resolveSoravynInstanceRoot(), "secrets", "master.key");
}

export function resolveDefaultStorageDir(): string {
  return path.resolve(resolveSoravynInstanceRoot(), "data", "storage");
}

export function resolveDefaultBackupDir(): string {
  return path.resolve(resolveSoravynInstanceRoot(), "data", "backups");
}

export function resolveDefaultAgentWorkspaceDir(agentId: string): string {
  const trimmed = agentId.trim();
  if (!PATH_SEGMENT_RE.test(trimmed)) {
    throw new Error(`Invalid agent id for workspace path '${agentId}'.`);
  }
  return path.resolve(resolveSoravynInstanceRoot(), "workspaces", trimmed);
}

export function resolveHomeAwarePath(value: string): string {
  return path.resolve(expandHomePrefix(value));
}
