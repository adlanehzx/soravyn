CREATE TABLE "content_performance_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"calendar_item_id" uuid,
	"external_post_id" varchar(255),
	"channel" varchar(100) NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"shares" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	"spend_cents" integer DEFAULT 0 NOT NULL,
	"revenue_cents" integer DEFAULT 0 NOT NULL,
	"engagement_rate" real DEFAULT 0 NOT NULL,
	"roi_percent" real,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategic_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"category" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"observation" text NOT NULL,
	"recommendation" text NOT NULL,
	"confidence_score" real DEFAULT 0.8 NOT NULL,
	"impact_level" varchar(20) DEFAULT 'medium' NOT NULL,
	"applied_to_brand_memory" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_performance_metrics" ADD CONSTRAINT "content_performance_metrics_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_performance_metrics" ADD CONSTRAINT "content_performance_metrics_calendar_item_id_editorial_calendar_items_id_fk" FOREIGN KEY ("calendar_item_id") REFERENCES "public"."editorial_calendar_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategic_insights" ADD CONSTRAINT "strategic_insights_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_perf_metrics_company" ON "content_performance_metrics" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_perf_metrics_item" ON "content_performance_metrics" USING btree ("calendar_item_id");--> statement-breakpoint
CREATE INDEX "idx_perf_metrics_channel" ON "content_performance_metrics" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "idx_perf_metrics_recorded" ON "content_performance_metrics" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "idx_strat_insights_company" ON "strategic_insights" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_strat_insights_category" ON "strategic_insights" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_strat_insights_created" ON "strategic_insights" USING btree ("created_at");