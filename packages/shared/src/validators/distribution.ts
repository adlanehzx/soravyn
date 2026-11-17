import { z } from "zod";

export const distributionChannelTypeSchema = z.enum([
  "linkedin",
  "youtube",
  "tiktok",
  "x",
  "webhook",
  "cms",
]);

export const distributionChannelStatusSchema = z.enum([
  "active",
  "paused",
  "error",
]);

export const createDistributionChannelSchema = z.object({
  channelType: distributionChannelTypeSchema,
  name: z.string().min(1).max(100),
  status: distributionChannelStatusSchema.default("active"),
  endpointUrl: z.string().url().optional().nullable(),
  authConfig: z.record(z.any()).optional().nullable(),
  headers: z.record(z.string()).optional().nullable(),
});

export const updateDistributionChannelSchema = createDistributionChannelSchema.partial();

export const publishItemInputSchema = z.object({
  channelId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime().optional(),
  customCopy: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
