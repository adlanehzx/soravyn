import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { marketingPlans, marketingPlanThemes, marketingPlanProposals } from "./marketing_plan.js";
import { campaigns } from "./studio.js";

export const editorialCalendarItems = pgTable(
  "editorial_calendar_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .references(() => marketingPlans.id, { onDelete: "set null" }),
    themeId: uuid("theme_id")
      .references(() => marketingPlanThemes.id, { onDelete: "set null" }),
    proposalId: uuid("proposal_id")
      .references(() => marketingPlanProposals.id, { onDelete: "set null" }),
    campaignId: uuid("campaign_id")
      .references(() => campaigns.id, { onDelete: "set null" }),
    title: varchar("title", { length: 255 }).notNull(),
    contentType: varchar("content_type", { length: 50 }).notNull(), // "video" | "social_post" | "email" | "article"
    channel: varchar("channel", { length: 100 }).notNull(), // "LinkedIn", "YouTube", "TikTok", "X", "Newsletter", "Blog"
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    status: varchar("status", { length: 50 }).notNull().default("draft"), // "draft" | "scheduled" | "in_production" | "ready_for_review" | "approved" | "published" | "cancelled"
    contentBrief: text("content_brief"),
    copyText: text("copy_text"),
    targetAudience: varchar("target_audience", { length: 255 }),
    assignedAgentId: uuid("assigned_agent_id"),
    assignedUserId: varchar("assigned_user_id", { length: 255 }),
    publishedUrl: varchar("published_url", { length: 1000 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_editorial_company").on(table.companyId),
    index("idx_editorial_scheduled_at").on(table.scheduledAt),
    index("idx_editorial_status").on(table.status),
    index("idx_editorial_content_type").on(table.contentType),
  ],
);
