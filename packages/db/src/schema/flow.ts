import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { campaigns } from "./studio.js";
export const flowJobs = pgTable(
  "studio_flow_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id),
    prompt: text("prompt").notNull(),
    maxCredits: integer("max_credits").notNull(),
    observedCredits: integer("observed_credits"),
    status: text("status").notNull().default("queued"),
    stage: text("stage").notNull().default("queued"),
    message: text("message"),
    leaseToken: uuid("lease_token"),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    events: jsonb("events")
      .$type<{ stage: string; at: string }[]>()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    queue: index("studio_flow_queue_idx").on(t.status, t.createdAt),
    company: index("studio_flow_company_idx").on(t.companyId),
  })
);
