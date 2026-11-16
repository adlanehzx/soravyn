CREATE TABLE "studio_flow_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"prompt" text NOT NULL,
	"max_credits" integer NOT NULL,
	"observed_credits" integer,
	"status" text DEFAULT 'queued' NOT NULL,
	"stage" text DEFAULT 'queued' NOT NULL,
	"message" text,
	"lease_token" uuid,
	"lease_until" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studio_flow_jobs" ADD CONSTRAINT "studio_flow_jobs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_flow_jobs" ADD CONSTRAINT "studio_flow_jobs_campaign_id_studio_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."studio_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "studio_flow_queue_idx" ON "studio_flow_jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "studio_flow_company_idx" ON "studio_flow_jobs" USING btree ("company_id");