import { pgTable, uuid, text, jsonb, timestamp, integer, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { campaigns } from "./studio.js";
import { approvals } from "./approvals.js";
export const videoJobs = pgTable("studio_video_jobs", {
 id: uuid("id").primaryKey().defaultRandom(),
 companyId: uuid("company_id").notNull().references(() => companies.id),
 campaignId: uuid("campaign_id").notNull().references(() => campaigns.id),
 status: text("status").notNull().default("queued"),
 input: jsonb("input").$type<Record<string, unknown>>().notNull(),
 events: jsonb("events").$type<{ stage: string; at: string }[]>().notNull().default([]),
 attempts: integer("attempts").notNull().default(0),
 leaseToken: uuid("lease_token"),
 leaseUntil: timestamp("lease_until", { withTimezone: true }),
 error: text("error"),
 approvalId: uuid("approval_id").references(() => approvals.id),
 createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
 updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({ queue: index("studio_video_queue_idx").on(t.status, t.createdAt), company: index("studio_video_company_idx").on(t.companyId) }));
