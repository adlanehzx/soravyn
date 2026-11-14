import { pgTable, uuid, text, jsonb, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { videoJobs } from "./video.js";

export const productionSteps = pgTable("production_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  jobId: uuid("job_id").notNull().references(() => videoJobs.id),
  stage: text("stage").notNull(), cacheKey: text("cache_key").notNull(),
  status: text("status").notNull(), attempts: integer("attempts").notNull().default(0),
  output: jsonb("output").$type<Record<string, unknown>>(), errorCode: text("error_code"),
  startedAt: timestamp("started_at", {withTimezone: true}), finishedAt: timestamp("finished_at", {withTimezone: true}),
}, t => ({jobStage: uniqueIndex("production_steps_job_stage").on(t.jobId, t.stage)}));
