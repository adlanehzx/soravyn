CREATE TABLE "campaign_corrections" (
	"approval_id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_deliverables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content" jsonb NOT NULL,
	"author_type" text NOT NULL,
	"author_id" text NOT NULL,
	"approval_id" uuid NOT NULL,
	"video_job_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"agent_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"status" text NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_workflows" (
	"campaign_id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"brand_snapshot" jsonb NOT NULL,
	"brief_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_corrections" ADD CONSTRAINT "campaign_corrections_approval_id_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."approvals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_corrections" ADD CONSTRAINT "campaign_corrections_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_corrections" ADD CONSTRAINT "campaign_corrections_campaign_id_studio_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."studio_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_corrections" ADD CONSTRAINT "campaign_corrections_task_id_issues_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_corrections" ADD CONSTRAINT "campaign_corrections_job_id_studio_video_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."studio_video_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_deliverables" ADD CONSTRAINT "campaign_deliverables_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_deliverables" ADD CONSTRAINT "campaign_deliverables_campaign_id_studio_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."studio_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_deliverables" ADD CONSTRAINT "campaign_deliverables_stage_id_campaign_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."campaign_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_deliverables" ADD CONSTRAINT "campaign_deliverables_task_id_issues_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_deliverables" ADD CONSTRAINT "campaign_deliverables_approval_id_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."approvals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_deliverables" ADD CONSTRAINT "campaign_deliverables_video_job_id_studio_video_jobs_id_fk" FOREIGN KEY ("video_job_id") REFERENCES "public"."studio_video_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_stages" ADD CONSTRAINT "campaign_stages_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_stages" ADD CONSTRAINT "campaign_stages_campaign_id_studio_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."studio_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_stages" ADD CONSTRAINT "campaign_stages_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_stages" ADD CONSTRAINT "campaign_stages_task_id_issues_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_workflows" ADD CONSTRAINT "campaign_workflows_campaign_id_studio_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."studio_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_workflows" ADD CONSTRAINT "campaign_workflows_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_deliverables_version" ON "campaign_deliverables" USING btree ("stage_id","version");--> statement-breakpoint
CREATE INDEX "campaign_deliverables_company" ON "campaign_deliverables" USING btree ("company_id","campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_stages_unique" ON "campaign_stages" USING btree ("campaign_id","kind");