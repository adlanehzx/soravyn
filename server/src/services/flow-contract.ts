import { z } from "zod";
import { join } from "node:path";
import { videoRoot } from "./video-contract.js";
export const flowRequest = z
  .object({
    campaignId: z.string().uuid(),
    prompt: z.string().trim().min(10).max(12000),
    maxCredits: z.number().int().min(1).max(1000),
    confirmCreditSpend: z.literal(true),
  })
  .strict();
export function flowUrl(value: string) {
  const u = new URL(value);
  if (
    u.protocol !== "https:" ||
    !["flow.google.com", "labs.google"].includes(u.hostname) ||
    u.username ||
    u.password ||
    u.hash ||
    u.search ||
    (u.hostname === "labs.google" && !u.pathname.startsWith("/fx/"))
  )
    throw new Error(
      "Flow project URL must be a Google Flow HTTPS URL without credentials or query"
    );
  return value;
}
// No default selectors: authenticated controls must be inspected and calibrated, never guessed.
export const flowRecipe = z
  .object({
    projectUrl: z.string().transform(flowUrl),
    ready: z.string().min(1),
    settings: z.string().min(1),
    settingsText: z.string().min(1),
    prompt: z.string().min(1),
    submit: z.string().min(1),
    price: z.string().min(1),
    priceText: z.string().min(1),
    credits: z.number().int().min(1).max(1000),
    download: z.string().min(1),
    blockers: z.array(z.string().min(1)).min(1),
    reviewedAt: z.string().datetime(),
  })
  .strict();
export function flowDirectory(companyId: string) {
  return join(videoRoot(), "flow", z.string().uuid().parse(companyId));
}
export function checkedPrice(
  text: string,
  expected: string,
  credits: number,
  max: number
) {
  if (text.trim() !== expected.trim() || credits > max)
    throw new Error("PRICE_NOT_AUTHORIZED");
  return credits;
}
