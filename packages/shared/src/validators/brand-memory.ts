import { z } from "zod";

const short = z.string().trim().max(2000);

export const brandProductInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().max(100).default(""),
  description: short.default(""),
  pricing: z.string().trim().max(200).default(""),
  currency: z.string().trim().max(10).default("EUR"),
  valueProposition: short.default(""),
  keyFeatures: z.array(z.string().trim().max(500)).max(30).default([]),
  targetAudience: z.string().trim().max(500).default(""),
}).strict();

export const brandPersonaInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  role: z.string().trim().max(200).default(""),
  demographics: short.default(""),
  painPoints: z.array(z.string().trim().max(500)).max(20).default([]),
  goals: z.array(z.string().trim().max(500)).max(20).default([]),
  objections: z.array(z.string().trim().max(500)).max(20).default([]),
  preferredChannels: z.array(z.string().trim().max(100)).max(20).default([]),
}).strict();

export const brandObjectionInputSchema = z.object({
  objection: z.string().trim().min(1).max(1000),
  category: z.enum(["pricing", "product", "trust", "technical", "timing", "other"]).default("pricing"),
  recommendedResponse: z.string().trim().min(1).max(2000),
  verifiableProof: short.default(""),
  productId: z.string().uuid().nullable().optional(),
}).strict();

export const brandSourceInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  kind: z.enum(["document", "faq", "guideline", "case_study", "benchmark", "proof"]).default("document"),
  content: z.string().trim().min(1).max(20000),
  sourceUrl: z.string().trim().max(1000).default(""),
  tags: z.array(z.string().trim().max(50)).max(20).default([]),
  verified: z.enum(["verified", "draft"]).default("verified"),
}).strict();

export const prepareBriefInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  objectives: z.string().trim().min(1).max(2000),
  brief: z.string().trim().min(1).max(20000),
  productId: z.string().uuid().nullable().optional(),
  personaId: z.string().uuid().nullable().optional(),
  channels: z.array(z.string().trim().max(80)).max(20).default([]),
}).strict();

export type BrandProductInput = z.infer<typeof brandProductInputSchema>;
export type BrandPersonaInput = z.infer<typeof brandPersonaInputSchema>;
export type BrandObjectionInput = z.infer<typeof brandObjectionInputSchema>;
export type BrandSourceInput = z.infer<typeof brandSourceInputSchema>;
export type PrepareBriefInput = z.infer<typeof prepareBriefInputSchema>;
