import { z } from "zod";

const short = z.string().trim().max(2000);

export const generateMarketingPlanInputSchema = z.object({
  periodMonth: z.string().trim().min(4).max(20),
  commercialGoal: z.string().trim().min(5).max(1000),
  targetAudience: z.string().trim().max(500).default(""),
  totalBudget: z.number().int().nonnegative().max(10000000).default(5000),
  currency: z.string().trim().max(10).default("EUR"),
  priorities: z.array(z.string().trim().max(200)).max(10).default([]),
  primaryChannels: z.array(z.string().trim().max(80)).max(10).default([]),
  focusProductIds: z.array(z.string().uuid()).max(10).default([]),
  focusPersonaIds: z.array(z.string().uuid()).max(10).default([]),
}).strict();

export const marketingPlanInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: short.default(""),
  periodMonth: z.string().trim().min(4).max(20),
  commercialGoal: z.string().trim().min(1).max(1000),
  targetAudience: z.string().trim().max(500).default(""),
  totalBudget: z.number().int().nonnegative().max(10000000).default(0),
  currency: z.string().trim().max(10).default("EUR"),
  priorities: z.array(z.string().trim().max(200)).max(10).default([]),
  primaryChannels: z.array(z.string().trim().max(80)).max(10).default([]),
  kpiTargets: z.record(z.union([z.string(), z.number()])).default({}),
}).strict();

export const marketingPlanUpdateSchema = marketingPlanInputSchema.partial();

export const marketingPlanThemeInputSchema = z.object({
  weekNumber: z.number().int().min(1).max(52).default(1),
  title: z.string().trim().min(1).max(200),
  description: short.default(""),
  focusPersonaId: z.string().uuid().nullable().optional(),
  focusProductId: z.string().uuid().nullable().optional(),
  allocatedBudget: z.number().int().nonnegative().max(10000000).default(0),
  targetKpi: z.string().trim().max(300).default(""),
  orderIndex: z.number().int().min(0).max(100).default(0),
}).strict();

export const marketingPlanProposalInputSchema = z.object({
  themeId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(200),
  channel: z.string().trim().min(1).max(100),
  format: z.string().trim().min(1).max(100),
  angle: short.default(""),
  hook: short.default(""),
  callToAction: short.default(""),
  estimatedCost: z.number().int().nonnegative().max(10000000).default(0),
  targetAudience: z.string().trim().max(500).default(""),
  status: z.enum(["suggested", "accepted", "converted", "dismissed"]).default("suggested"),
}).strict();

export const submitPlanValidationInputSchema = z.object({
  notes: z.string().trim().max(2000).optional(),
}).strict();

export type GenerateMarketingPlanInputType = z.infer<typeof generateMarketingPlanInputSchema>;
export type MarketingPlanInput = z.infer<typeof marketingPlanInputSchema>;
export type MarketingPlanUpdateInput = z.infer<typeof marketingPlanUpdateSchema>;
export type MarketingPlanThemeInput = z.infer<typeof marketingPlanThemeInputSchema>;
export type MarketingPlanProposalInput = z.infer<typeof marketingPlanProposalInputSchema>;
export type SubmitPlanValidationInput = z.infer<typeof submitPlanValidationInputSchema>;
