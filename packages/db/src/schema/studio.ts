import { pgTable, uuid, text, jsonb, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { issues } from "./issues.js";
import { agents } from "./agents.js";

// A client is a company boundary, so existing server memberships apply to all brand data.
export const brandProfiles = pgTable("brand_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  industry: text("industry").notNull().default(""),
  audience: text("audience").notNull().default(""),
  tone: text("tone").notNull().default(""),
  languages: jsonb("languages").$type<string[]>().notNull().default([]),
  colors: jsonb("colors").$type<string[]>().notNull().default([]),
  fontFamily: text("font_family").notNull().default("sans"),
  editorialRules: text("editorial_rules").notNull().default(""),
  logoAssetId: uuid("logo_asset_id"),
  logoLicense: text("logo_license").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({ company: uniqueIndex("brand_profiles_company_idx").on(t.companyId) }));

export const campaigns = pgTable("studio_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  objectives: text("objectives").notNull(),
  audience: text("audience").notNull().default(""),
  channels: jsonb("channels").$type<string[]>().notNull().default([]),
  brief: text("brief").notNull(),
  strategy: text("strategy").notNull().default(""),
  producerAgentId: uuid("producer_agent_id").references(() => agents.id),
  producerTaskId: uuid("producer_task_id").references(() => issues.id),
  status: text("status").notNull().default("brief"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({ company: index("studio_campaigns_company_idx").on(t.companyId) }));
