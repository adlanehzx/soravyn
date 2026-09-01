import { applyLegacyEnvironment, LEGACY_HOME_NAMES } from "@soravyn/shared";
import fs from "node:fs";
import path from "node:path";
import { resolveDefaultConfigPath } from "./home-paths.js";

const SORAVYN_CONFIG_BASENAME = "config.json";
const SORAVYN_ENV_FILENAME = ".env";

function findConfigFileFromAncestors(startDir: string): string | null {
  const absoluteStartDir = path.resolve(startDir);
  let currentDir = absoluteStartDir;

  while (true) {
    for(const directory of [".soravyn",...LEGACY_HOME_NAMES]){const candidate=path.resolve(currentDir,directory,SORAVYN_CONFIG_BASENAME);if(fs.existsSync(candidate))return candidate;}

    const nextDir = path.resolve(currentDir, "..");
    if (nextDir === currentDir) break;
    currentDir = nextDir;
  }

  return null;
}

export function resolveSoravynConfigPath(overridePath?: string): string {
  if (overridePath) return path.resolve(overridePath);
  applyLegacyEnvironment(process.env);
  const envConfig = process.env.SORAVYN_CONFIG;
  if (envConfig) return path.resolve(envConfig);
  return findConfigFileFromAncestors(process.cwd()) ?? resolveDefaultConfigPath();
}

export function resolveSoravynEnvPath(overrideConfigPath?: string): string {
  return path.resolve(path.dirname(resolveSoravynConfigPath(overrideConfigPath)), SORAVYN_ENV_FILENAME);
}
