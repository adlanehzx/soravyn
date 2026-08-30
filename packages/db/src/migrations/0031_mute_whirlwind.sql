CREATE TABLE "campaign_measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"metric" text NOT NULL,
	"value" integer NOT NULL,
	"target" integer,
	"unit" text NOT NULL,
	"source" text NOT NULL,
	"measured_at" timestamp with time zone NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"delivered_at" timestamp with time zone,
	"external_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_measurements" ADD CONSTRAINT "campaign_measurements_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_measurements" ADD CONSTRAINT "campaign_measurements_campaign_id_studio_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."studio_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_schedule" ADD CONSTRAINT "campaign_schedule_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_schedule" ADD CONSTRAINT "campaign_schedule_campaign_id_studio_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."studio_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_schedule" ADD CONSTRAINT "campaign_schedule_job_id_studio_video_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."studio_video_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_measurements_company" ON "campaign_measurements" USING btree ("company_id","campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_schedule_slot" ON "campaign_schedule" USING btree ("job_id","channel","scheduled_at");--> statement-breakpoint
CREATE INDEX "campaign_schedule_company" ON "campaign_schedule" USING btree ("company_id","scheduled_at");