import { z } from "zod";

export const editorialContentTypeSchema = z.enum([
  "video",
  "social_post",
  "email",
  "article",
]);

export const editorialStatusSchema = z.enum([
  "draft",
  "scheduled",
  "in_production",
  "ready_for_review",
  "approved",
  "published",
  "cancelled",
]);

export const createEditorialCalendarItemSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(255),
  contentType: editorialContentTypeSchema,
  channel: z.string().min(1, "Le canal de diffusion est requis").max(100),
  scheduledAt: z.string().datetime({ message: "Date de programmation ISO invalide" }),
  status: editorialStatusSchema.default("draft"),
  contentBrief: z.string().optional(),
  copyText: z.string().optional(),
  targetAudience: z.string().max(255).optional(),
  planId: z.string().uuid().nullable().optional(),
  themeId: z.string().uuid().nullable().optional(),
  proposalId: z.string().uuid().nullable().optional(),
  campaignId: z.string().uuid().nullable().optional(),
  assignedAgentId: z.string().uuid().nullable().optional(),
  assignedUserId: z.string().max(255).nullable().optional(),
  publishedUrl: z.string().url().max(1000).nullable().optional(),
});

export const updateEditorialCalendarItemSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  contentType: editorialContentTypeSchema.optional(),
  channel: z.string().min(1).max(100).optional(),
  scheduledAt: z.string().datetime().optional(),
  status: editorialStatusSchema.optional(),
  contentBrief: z.string().optional(),
  copyText: z.string().optional(),
  targetAudience: z.string().max(255).optional(),
  assignedAgentId: z.string().uuid().nullable().optional(),
  assignedUserId: z.string().max(255).nullable().optional(),
  publishedUrl: z.string().url().max(1000).nullable().optional(),
});

export const generateCalendarFromPlanSchema = z.object({
  planId: z.string().uuid("ID de plan marketing invalide"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date YYYY-MM-DD requis").optional(),
  preferredPostTimes: z.record(z.string()).optional(),
});

export const editorialCalendarFilterSchema = z.object({
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/, "Format de mois YYYY-MM requis").optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  contentType: editorialContentTypeSchema.optional(),
  channel: z.string().optional(),
  status: editorialStatusSchema.optional(),
  planId: z.string().uuid().optional(),
});
