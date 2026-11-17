CREATE TABLE "distribution_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"channel_type" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"endpoint_url" text,
	"auth_config" jsonb,
	"headers" jsonb,
	"last_sync_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "distribution_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"calendar_item_id" uuid NOT NULL,
	"channel_id" uuid,
	"channel_type" varchar(50) NOT NULL,
	"status" varchar(50) NOT NULL,
	"request_payload" jsonb,
	"response_payload" jsonb,
	"http_status" integer,
	"external_post_id" varchar(255),
	"external_post_url" varchar(1000),
	"error_message" text,
	"dispatched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dispatched_by" varchar(255)
);
--> statement-breakpoint
ALTER TABLE "distribution_channels" ADD CONSTRAINT "distribution_channels_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_logs" ADD CONSTRAINT "distribution_logs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_logs" ADD CONSTRAINT "distribution_logs_calendar_item_id_editorial_calendar_items_id_fk" FOREIGN KEY ("calendar_item_id") REFERENCES "public"."editorial_calendar_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_logs" ADD CONSTRAINT "distribution_logs_channel_id_distribution_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."distribution_channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_dist_channels_company" ON "distribution_channels" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_dist_channels_type" ON "distribution_channels" USING btree ("channel_type");--> statement-breakpoint
CREATE INDEX "idx_dist_channels_status" ON "distribution_channels" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_dist_logs_company" ON "distribution_logs" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_dist_logs_item" ON "distribution_logs" USING btree ("calendar_item_id");--> statement-breakpoint
CREATE INDEX "idx_dist_logs_dispatched" ON "distribution_logs" USING btree ("dispatched_at");