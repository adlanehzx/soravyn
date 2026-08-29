CREATE TABLE "brand_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"industry" text DEFAULT '' NOT NULL,
	"audience" text DEFAULT '' NOT NULL,
	"tone" text DEFAULT '' NOT NULL,
	"languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"colors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "studio_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"objectives" text NOT NULL,
	"audience" text DEFAULT '' NOT NULL,
	"channels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"brief" text NOT NULL,
	"strategy" text DEFAULT '' NOT NULL,
	"producer_agent_id" uuid,
	"status" text DEFAULT 'brief' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD CONSTRAINT "brand_profiles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_campaigns" ADD CONSTRAINT "studio_campaigns_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_campaigns" ADD CONSTRAINT "studio_campaigns_producer_agent_id_agents_id_fk" FOREIGN KEY ("producer_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "brand_profiles_company_idx" ON "brand_profiles" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "studio_campaigns_company_idx" ON "studio_campaigns" USING btree ("company_id");