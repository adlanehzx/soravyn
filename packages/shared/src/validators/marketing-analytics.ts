import { z } from "zod";

export const performanceMetricInputSchema = z.object({
  calendarItemId: z.string().uuid().optional(),
  externalPostId: z.string().optional(),
  channel: z.string().min(1).max(100),
  impressions: z.number().int().nonnegative().default(0),
  views: z.number().int().nonnegative().default(0),
  clicks: z.number().int().nonnegative().default(0),
  likes: z.number().int().nonnegative().default(0),
  shares: z.number().int().nonnegative().default(0),
  comments: z.number().int().nonnegative().default(0),
  conversions: z.number().int().nonnegative().default(0),
  spendCents: z.number().int().nonnegative().default(0),
  revenueCents: z.number().int().nonnegative().default(0),
  recordedAt: z.string().datetime().optional(),
});

export const batchMetricsInputSchema = z.object({
  metrics: z.array(performanceMetricInputSchema).min(1),
});

export const triggerFeedbackLoopInputSchema = z.object({
  timeframeDays: z.number().int().positive().default(30),
  autoApplyToBrandMemory: z.boolean().default(true),
});
