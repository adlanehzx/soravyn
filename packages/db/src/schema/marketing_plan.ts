import { pgTable, uuid, text, jsonb, timestamp, integer, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { approvals } from "./approvals.js";
import { campaigns } from "./studio.js";
import { brandProducts, brandPersonas } from "./brand_memory.js";

export const marketingPlans = pgTable("marketing_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  periodMonth: text("period_month").notNull(),
  commercialGoal: text("commercial_goal").notNull(),
  targetAudience: text("target_audience").notNull().default(""),
  totalBudget: integer("total_budget").notNull().default(0),
  currency: text("currency").notNull().default("EUR"),
  priorities: jsonb("priorities").$type<string[]>().notNull().default([]),
  primaryChannels: jsonb("primary_channels").$type<string[]>().notNull().default([]),
  status: text("status").notNull().default("draft"),
  approvalId: uuid("approval_id").references(() => approvals.id),
  rejectionReason: text("rejection_reason"),
  kpiTargets: jsonb("kpi_targets").$type<Record<string, string | number>>().notNull().default({}),
  createdByUserId: text("created_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  company: index("marketing_plans_company_idx").on(t.companyId),
  approval: index("marketing_plans_approval_idx").on(t.approvalId),
}));

export const marketingPlanThemes = pgTable("marketing_plan_themes", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").notNull().references(() => marketingPlans.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  weekNumber: integer("week_number").notNull().default(1),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  focusPersonaId: uuid("focus_persona_id").references(() => brandPersonas.id, { onDelete: "set null" }),
  focusProductId: uuid("focus_product_id").references(() => brandProducts.id, { onDelete: "set null" }),
  allocatedBudget: integer("allocated_budget").notNull().default(0),
  targetKpi: text("target_kpi").notNull().default(""),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  plan: index("marketing_plan_themes_plan_idx").on(t.planId),
  company: index("marketing_plan_themes_company_idx").on(t.companyId),
}));

export const marketingPlanProposals = pgTable("marketing_plan_proposals", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").notNull().references(() => marketingPlans.id, { onDelete: "cascade" }),
  themeId: uuid("theme_id").references(() => marketingPlanThemes.id, { onDelete: "set null" }),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  channel: text("channel").notNull(),
  format: text("format").notNull(),
  angle: text("angle").notNull().default(""),
  hook: text("hook").notNull().default(""),
  callToAction: text("call_to_action").notNull().default(""),
  estimatedCost: integer("estimated_cost").notNull().default(0),
  targetAudience: text("target_audience").notNull().default(""),
  campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  status: text("status").notNull().default("suggested"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  plan: index("marketing_plan_proposals_plan_idx").on(t.planId),
  company: index("marketing_plan_proposals_company_idx").on(t.companyId),
  campaign: index("marketing_plan_proposals_campaign_idx").on(t.campaignId),
}));
