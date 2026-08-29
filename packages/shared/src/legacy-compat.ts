/** Backward compatibility only. Product code and new installations use SORAVYN. */
export const LEGACY_HOME_NAMES = [".opensoul", ".paperclip"] as const;
export const LEGACY_LOCAL_BOARD_EMAIL = "local@paperclip.local";
export const LEGACY_AUTH_DEFAULTS = { secret: "paperclip-dev-secret", issuer: "paperclip", audience: "paperclip-api" } as const;
export function applyLegacyEnvironment(env: Record<string,string|undefined>) {
  // Explicit SORAVYN settings always win; OpenSoul precedes older Paperclip settings.
  for (const prefix of ["OPENSOUL_", "PAPERCLIP_"]) {
    for (const [key,value] of Object.entries(env)) {
      if (key.startsWith(prefix) && value !== undefined) {
        const canonical = `SORAVYN_${key.slice(prefix.length)}`;
        if (env[canonical] === undefined) env[canonical] = value;
      }
    }
  }
  return env;
}
const runtime=globalThis as typeof globalThis & {process?:{env?:Record<string,string|undefined>}};
if(runtime.process?.env)applyLegacyEnvironment(runtime.process.env);
