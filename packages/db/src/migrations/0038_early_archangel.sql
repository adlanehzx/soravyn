CREATE TABLE "editorial_calendar_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"plan_id" uuid,
	"theme_id" uuid,
	"proposal_id" uuid,
	"campaign_id" uuid,
	"title" varchar(255) NOT NULL,
	"content_type" varchar(50) NOT NULL,
	"channel" varchar(100) NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"content_brief" text,
	"copy_text" text,
	"target_audience" varchar(255),
	"assigned_agent_id" uuid,
	"assigned_user_id" varchar(255),
	"published_url" varchar(1000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "editorial_calendar_items" ADD CONSTRAINT "editorial_calendar_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_calendar_items" ADD CONSTRAINT "editorial_calendar_items_plan_id_marketing_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."marketing_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_calendar_items" ADD CONSTRAINT "editorial_calendar_items_theme_id_marketing_plan_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."marketing_plan_themes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_calendar_items" ADD CONSTRAINT "editorial_calendar_items_proposal_id_marketing_plan_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."marketing_plan_proposals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_calendar_items" ADD CONSTRAINT "editorial_calendar_items_campaign_id_studio_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."studio_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_editorial_company" ON "editorial_calendar_items" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_editorial_scheduled_at" ON "editorial_calendar_items" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_editorial_status" ON "editorial_calendar_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_editorial_content_type" ON "editorial_calendar_items" USING btree ("content_type");