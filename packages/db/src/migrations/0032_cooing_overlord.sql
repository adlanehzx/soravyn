CREATE TABLE "campaign_budgets" (
	"campaign_id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"limit_cents" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_copy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"source_job_id" uuid,
	"revision_of" uuid,
	"decision_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_review_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"label" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"decision" text,
	"decision_note" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"scene_index" integer NOT NULL,
	"time_ms" integer NOT NULL,
	"body" text NOT NULL,
	"author" text NOT NULL,
	"task_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD COLUMN "font_family" text DEFAULT 'sans' NOT NULL;--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD COLUMN "editorial_rules" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD COLUMN "logo_asset_id" uuid;--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD COLUMN "logo_license" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "campaign_budgets" ADD CONSTRAINT "campaign_budgets_campaign_id_studio_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."studio_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_budgets" ADD CONSTRAINT "campaign_budgets_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_copy" ADD CONSTRAINT "campaign_copy_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_copy" ADD CONSTRAINT "campaign_copy_campaign_id_studio_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."studio_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_copy" ADD CONSTRAINT "campaign_copy_source_job_id_studio_video_jobs_id_fk" FOREIGN KEY ("source_job_id") REFERENCES "public"."studio_video_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_reservations" ADD CONSTRAINT "campaign_reservations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_reservations" ADD CONSTRAINT "campaign_reservations_campaign_id_studio_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."studio_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_reservations" ADD CONSTRAINT "campaign_reservations_task_id_issues_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_review_links" ADD CONSTRAINT "client_review_links_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_review_links" ADD CONSTRAINT "client_review_links_job_id_studio_video_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."studio_video_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_notes" ADD CONSTRAINT "video_notes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_notes" ADD CONSTRAINT "video_notes_job_id_studio_video_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."studio_video_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_notes" ADD CONSTRAINT "video_notes_task_id_issues_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_copy_company" ON "campaign_copy" USING btree ("company_id","campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_reservation_task" ON "campaign_reservations" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "client_review_links_job" ON "client_review_links" USING btree ("company_id","job_id");--> statement-breakpoint
CREATE INDEX "video_notes_job" ON "video_notes" USING btree ("company_id","job_id");