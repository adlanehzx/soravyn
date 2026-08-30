import { pgTable, uuid, text, jsonb, timestamp, integer, uniqueIndex, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { campaigns } from "./studio.js";
import { agents } from "./agents.js";
import { issues } from "./issues.js";
import { approvals } from "./approvals.js";
import { videoJobs } from "./video.js";
export const campaignWorkflows=pgTable("campaign_workflows",{
 campaignId:uuid("campaign_id").primaryKey().references(()=>campaigns.id),
 companyId:uuid("company_id").notNull().references(()=>companies.id),
 brandSnapshot:jsonb("brand_snapshot").$type<Record<string,unknown>>().notNull(),
 briefSnapshot:jsonb("brief_snapshot").$type<Record<string,unknown>>().notNull(),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
});
export const campaignStages=pgTable("campaign_stages",{
 id:uuid("id").primaryKey().defaultRandom(),companyId:uuid("company_id").notNull().references(()=>companies.id),
 campaignId:uuid("campaign_id").notNull().references(()=>campaigns.id),
 kind:text("kind").notNull(),agentId:uuid("agent_id").notNull().references(()=>agents.id),
 taskId:uuid("task_id").notNull().references(()=>issues.id),status:text("status").notNull(),
 version:integer("version").notNull().default(0),
 updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow(),
},t=>({stage:uniqueIndex("campaign_stages_unique").on(t.campaignId,t.kind)}));
export const campaignDeliverables=pgTable("campaign_deliverables",{
 id:uuid("id").primaryKey().defaultRandom(),companyId:uuid("company_id").notNull().references(()=>companies.id),
 campaignId:uuid("campaign_id").notNull().references(()=>campaigns.id),stageId:uuid("stage_id").notNull().references(()=>campaignStages.id),
 taskId:uuid("task_id").notNull().references(()=>issues.id),version:integer("version").notNull(),
 content:jsonb("content").$type<Record<string,unknown>>().notNull(),
 authorType:text("author_type").notNull(),authorId:text("author_id").notNull(),
 approvalId:uuid("approval_id").notNull().references(()=>approvals.id),
 videoJobId:uuid("video_job_id").references(()=>videoJobs.id),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
},t=>({version:uniqueIndex("campaign_deliverables_version").on(t.stageId,t.version),company:index("campaign_deliverables_company").on(t.companyId,t.campaignId)}));
export const campaignCorrections=pgTable("campaign_corrections",{
 approvalId:uuid("approval_id").primaryKey().references(()=>approvals.id),companyId:uuid("company_id").notNull().references(()=>companies.id),
 campaignId:uuid("campaign_id").notNull().references(()=>campaigns.id),taskId:uuid("task_id").notNull().references(()=>issues.id),
 jobId:uuid("job_id").notNull().references(()=>videoJobs.id),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
});
export const campaignSchedule=pgTable("campaign_schedule",{
 id:uuid("id").primaryKey().defaultRandom(),companyId:uuid("company_id").notNull().references(()=>companies.id),
 campaignId:uuid("campaign_id").notNull().references(()=>campaigns.id),jobId:uuid("job_id").notNull().references(()=>videoJobs.id),
 channel:text("channel").notNull(),scheduledAt:timestamp("scheduled_at",{withTimezone:true}).notNull(),
 status:text("status").notNull().default("planned"),deliveredAt:timestamp("delivered_at",{withTimezone:true}),
 externalUrl:text("external_url"),createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
},t=>({slot:uniqueIndex("campaign_schedule_slot").on(t.jobId,t.channel,t.scheduledAt),company:index("campaign_schedule_company").on(t.companyId,t.scheduledAt)}));
export const campaignMeasurements=pgTable("campaign_measurements",{
 id:uuid("id").primaryKey().defaultRandom(),companyId:uuid("company_id").notNull().references(()=>companies.id),
 campaignId:uuid("campaign_id").notNull().references(()=>campaigns.id),metric:text("metric").notNull(),
 value:integer("value").notNull(),target:integer("target"),unit:text("unit").notNull(),source:text("source").notNull(),
 measuredAt:timestamp("measured_at",{withTimezone:true}).notNull(),createdByUserId:text("created_by_user_id").notNull(),
 createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
},t=>({company:index("campaign_measurements_company").on(t.companyId,t.campaignId)}));
