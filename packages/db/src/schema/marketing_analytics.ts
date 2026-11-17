import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  real,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { editorialCalendarItems } from "./editorial_calendar.js";

export const contentPerformanceMetrics = pgTable(
  "content_performance_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    calendarItemId: uuid("calendar_item_id").references(
      () => editorialCalendarItems.id,
      { onDelete: "set null" }
    ),
    externalPostId: varchar("external_post_id", { length: 255 }),
    channel: varchar("channel", { length: 100 }).notNull(),
    impressions: integer("impressions").notNull().default(0),
    views: integer("views").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    likes: integer("likes").notNull().default(0),
    shares: integer("shares").notNull().default(0),
    comments: integer("comments").notNull().default(0),
    conversions: integer("conversions").notNull().default(0),
    spendCents: integer("spend_cents").notNull().default(0),
    revenueCents: integer("revenue_cents").notNull().default(0),
    engagementRate: real("engagement_rate").notNull().default(0),
    roiPercent: real("roi_percent"),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_perf_metrics_company").on(table.companyId),
    index("idx_perf_metrics_item").on(table.calendarItemId),
    index("idx_perf_metrics_channel").on(table.channel),
    index("idx_perf_metrics_recorded").on(table.recordedAt),
  ]
);

export const strategicInsights = pgTable(
  "strategic_insights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 50 }).notNull(), // "persona" | "channel" | "format" | "angle"
    title: varchar("title", { length: 255 }).notNull(),
    observation: text("observation").notNull(),
    recommendation: text("recommendation").notNull(),
    confidenceScore: real("confidence_score").notNull().default(0.8),
    impactLevel: varchar("impact_level", { length: 20 }).notNull().default("medium"), // "high" | "medium" | "low"
    appliedToBrandMemory: boolean("applied_to_brand_memory")
      .notNull()
      .default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_strat_insights_company").on(table.companyId),
    index("idx_strat_insights_category").on(table.category),
    index("idx_strat_insights_created").on(table.createdAt),
  ]
);
