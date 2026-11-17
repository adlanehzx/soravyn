import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const brandProducts = pgTable("brand_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  category: text("category").notNull().default(""),
  description: text("description").notNull().default(""),
  pricing: text("pricing").notNull().default(""),
  currency: text("currency").notNull().default("EUR"),
  valueProposition: text("value_proposition").notNull().default(""),
  keyFeatures: jsonb("key_features").$type<string[]>().notNull().default([]),
  targetAudience: text("target_audience").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({ company: index("brand_products_company_idx").on(t.companyId) }));

export const brandPersonas = pgTable("brand_personas", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  role: text("role").notNull().default(""),
  demographics: text("demographics").notNull().default(""),
  painPoints: jsonb("pain_points").$type<string[]>().notNull().default([]),
  goals: jsonb("goals").$type<string[]>().notNull().default([]),
  objections: jsonb("objections").$type<string[]>().notNull().default([]),
  preferredChannels: jsonb("preferred_channels").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({ company: index("brand_personas_company_idx").on(t.companyId) }));

export const brandObjections = pgTable("brand_objections", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  objection: text("objection").notNull(),
  category: text("category").notNull().default("pricing"),
  recommendedResponse: text("recommended_response").notNull(),
  verifiableProof: text("verifiable_proof").notNull().default(""),
  productId: uuid("product_id").references(() => brandProducts.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({ company: index("brand_objections_company_idx").on(t.companyId) }));

export const brandSources = pgTable("brand_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  title: text("title").notNull(),
  kind: text("kind").notNull().default("document"),
  content: text("content").notNull(),
  sourceUrl: text("source_url").notNull().default(""),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  verified: text("verified").notNull().default("verified"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({ company: index("brand_sources_company_idx").on(t.companyId) }));
