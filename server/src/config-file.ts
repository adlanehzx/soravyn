import fs from "node:fs";
import { soravynConfigSchema, type SoravynConfig } from "@soravyn/shared";
import { resolveSoravynConfigPath } from "./paths.js";

export function readConfigFile(): SoravynConfig | null {
  const configPath = resolveSoravynConfigPath();

  if (!fs.existsSync(configPath)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    return soravynConfigSchema.parse(raw);
  } catch {
    return null;
  }
}
