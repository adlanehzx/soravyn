import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";
import { issues } from "./issues.js";
import { heartbeatRuns } from "./heartbeat_runs.js";
export const companyGovernance = pgTable("company_governance", {
  companyId: uuid("company_id")
    .primaryKey()
    .references(() => companies.id),
  requireAgentPolicy: boolean("require_agent_policy").notNull().default(false),
  maxAgentRuns: integer("max_agent_runs").notNull().default(4),
  maxVideoRuns: integer("max_video_runs").notNull().default(1),
  artifactRetentionDays: integer("artifact_retention_days")
    .notNull()
    .default(30),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const agentExecutionPolicies = pgTable("agent_execution_policies", {
  agentId: uuid("agent_id")
    .primaryKey()
    .references(() => agents.id),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  policy: jsonb("policy").$type<Record<string, unknown>>().notNull(),
  approvedBy: text("approved_by").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const executionPermits = pgTable("execution_permits", {
  runId: uuid("run_id")
    .primaryKey()
    .references(() => heartbeatRuns.id),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id),
  issueId: uuid("issue_id").references(() => issues.id),
  status: text("status").notNull().default("active"),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});
export const taskCheckpoints = pgTable("task_checkpoints", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  issueId: uuid("issue_id")
    .notNull()
    .references(() => issues.id),
  runId: uuid("run_id")
    .notNull()
    .references(() => heartbeatRuns.id),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id),
  summary: text("summary").notNull(),
  output: jsonb("output").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const taskRecoveries = pgTable(
  "task_recoveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    issueId: uuid("issue_id")
      .notNull()
      .references(() => issues.id),
    sourceRunId: uuid("source_run_id")
      .notNull()
      .references(() => heartbeatRuns.id),
    checkpointId: uuid("checkpoint_id").references(() => taskCheckpoints.id),
    createdBy: text("created_by").notNull(),
    newRunId: uuid("new_run_id").references(() => heartbeatRuns.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    source: uniqueIndex("task_recovery_source_run").on(
      t.issueId,
      t.sourceRunId
    ),
  })
);
