import { pgTable, uuid, text, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { campaigns } from "./studio.js";
import { videoJobs } from "./video.js";
import { issues } from "./issues.js";

export const campaignCopy = pgTable("campaign_copy", {
  id: uuid("id").primaryKey().defaultRandom(), companyId: uuid("company_id").notNull().references(() => companies.id),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id), channel: text("channel").notNull(),
  title: text("title").notNull(), body: text("body").notNull(), status: text("status").notNull().default("draft"),
  sourceJobId: uuid("source_job_id").references(() => videoJobs.id), revisionOf: uuid("revision_of"),
  decisionNote: text("decision_note"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({ company: index("campaign_copy_company").on(t.companyId, t.campaignId) }));
export const videoNotes = pgTable("video_notes", {
  id: uuid("id").primaryKey().defaultRandom(), companyId: uuid("company_id").notNull().references(() => companies.id),
  jobId: uuid("job_id").notNull().references(() => videoJobs.id), sceneIndex: integer("scene_index").notNull(),
  timeMs: integer("time_ms").notNull(), body: text("body").notNull(), author: text("author").notNull(),
  taskId: uuid("task_id").references(() => issues.id), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({ job: index("video_notes_job").on(t.companyId, t.jobId) }));
export const clientReviewLinks = pgTable("client_review_links", {
  id: uuid("id").primaryKey().defaultRandom(), companyId: uuid("company_id").notNull().references(() => companies.id),
  jobId: uuid("job_id").notNull().references(() => videoJobs.id), tokenHash: text("token_hash").notNull(), label: text("label").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), revokedAt: timestamp("revoked_at", { withTimezone: true }),
  decision: text("decision"), decisionNote: text("decision_note"), decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({ job: index("client_review_links_job").on(t.companyId, t.jobId) }));
export const campaignBudgets = pgTable("campaign_budgets", {
  campaignId: uuid("campaign_id").primaryKey().references(() => campaigns.id), companyId: uuid("company_id").notNull().references(() => companies.id),
  limitCents: integer("limit_cents").notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const campaignReservations = pgTable("campaign_reservations", {
  id: uuid("id").primaryKey().defaultRandom(), companyId: uuid("company_id").notNull().references(() => companies.id),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id), taskId: uuid("task_id").notNull().references(() => issues.id),
  amountCents: integer("amount_cents").notNull(), releasedAt: timestamp("released_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({ task: uniqueIndex("campaign_reservation_task").on(t.taskId) }));
