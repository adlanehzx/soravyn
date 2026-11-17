import { z } from "zod";

export const generateStoryboardInputSchema = z.object({
  proposalId: z.string().uuid().optional(),
  calendarItemId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  platform: z.enum(["tiktok", "reels", "shorts", "youtube", "square"]).optional(),
  template: z.enum(["editorial", "product", "launch"]).optional(),
  narration: z.enum(["none", "fr", "en"]).default("fr"),
  customInstructions: z.string().trim().max(1000).optional(),
}).refine(
  data => data.proposalId || data.calendarItemId || data.campaignId,
  { message: "At least one of proposalId, calendarItemId, or campaignId must be provided" }
);
