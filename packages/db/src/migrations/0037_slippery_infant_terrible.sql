CREATE TABLE "marketing_plan_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"theme_id" uuid,
	"company_id" uuid NOT NULL,
	"title" text NOT NULL,
	"channel" text NOT NULL,
	"format" text NOT NULL,
	"angle" text DEFAULT '' NOT NULL,
	"hook" text DEFAULT '' NOT NULL,
	"call_to_action" text DEFAULT '' NOT NULL,
	"estimated_cost" integer DEFAULT 0 NOT NULL,
	"target_audience" text DEFAULT '' NOT NULL,
	"campaign_id" uuid,
	"status" text DEFAULT 'suggested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_plan_themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"week_number" integer DEFAULT 1 NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"focus_persona_id" uuid,
	"focus_product_id" uuid,
	"allocated_budget" integer DEFAULT 0 NOT NULL,
	"target_kpi" text DEFAULT '' NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"period_month" text NOT NULL,
	"commercial_goal" text NOT NULL,
	"target_audience" text DEFAULT '' NOT NULL,
	"total_budget" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"priorities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"primary_channels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"approval_id" uuid,
	"rejection_reason" text,
	"kpi_targets" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketing_plan_proposals" ADD CONSTRAINT "marketing_plan_proposals_plan_id_marketing_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."marketing_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_plan_proposals" ADD CONSTRAINT "marketing_plan_proposals_theme_id_marketing_plan_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."marketing_plan_themes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_plan_proposals" ADD CONSTRAINT "marketing_plan_proposals_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_plan_proposals" ADD CONSTRAINT "marketing_plan_proposals_campaign_id_studio_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."studio_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_plan_themes" ADD CONSTRAINT "marketing_plan_themes_plan_id_marketing_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."marketing_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_plan_themes" ADD CONSTRAINT "marketing_plan_themes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_plan_themes" ADD CONSTRAINT "marketing_plan_themes_focus_persona_id_brand_personas_id_fk" FOREIGN KEY ("focus_persona_id") REFERENCES "public"."brand_personas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_plan_themes" ADD CONSTRAINT "marketing_plan_themes_focus_product_id_brand_products_id_fk" FOREIGN KEY ("focus_product_id") REFERENCES "public"."brand_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_plans" ADD CONSTRAINT "marketing_plans_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_plans" ADD CONSTRAINT "marketing_plans_approval_id_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."approvals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "marketing_plan_proposals_plan_idx" ON "marketing_plan_proposals" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "marketing_plan_proposals_company_idx" ON "marketing_plan_proposals" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "marketing_plan_proposals_campaign_idx" ON "marketing_plan_proposals" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "marketing_plan_themes_plan_idx" ON "marketing_plan_themes" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "marketing_plan_themes_company_idx" ON "marketing_plan_themes" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "marketing_plans_company_idx" ON "marketing_plans" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "marketing_plans_approval_idx" ON "marketing_plans" USING btree ("approval_id");