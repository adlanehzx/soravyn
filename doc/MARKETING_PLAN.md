# Operational Marketing Plan and Governance Validation

SORAVYN's **Marketing Plan** engine turns an abstract commercial goal into a structured monthly plan that is fully editable and must go through governance validation before execution.

It relies directly on the **Brand Memory** (products, personas, arguments and objections) to automatically generate a 4-week strategic progression, allocate budgets and propose concrete campaigns that can be converted in one click.

---

## 1. Data model and multi-tenant isolation

All entities are partitioned at client level (`company_id`) with deletion cascades and strict company-boundary checks.

### PostgreSQL tables (`@soravyn/db`)

1. **`marketing_plans`**: monthly marketing plans
   - `id` (UUID PK)
   - `company_id` (UUID FK -> `companies.id` ON DELETE CASCADE)
   - `title` (varchar 200, e.g. *"Marketing Plan November 2026 — Scale-Up Acceleration"*)
   - `description` (text)
   - `period_month` (varchar 7, format `YYYY-MM`)
   - `commercial_goal` (varchar 1000, quantified target goal)
   - `target_audience` (varchar 500)
   - `total_budget` (integer, overall allocated budget)
   - `currency` (varchar 10, default `'EUR'`)
   - `priorities` (jsonb string[], priority strategic axes)
   - `primary_channels` (jsonb string[], e.g. `["LinkedIn", "YouTube", "TikTok"]`)
   - `status` (`draft` | `pending_validation` | `approved` | `rejected` | `archived`)
   - `approval_id` (UUID nullable FK -> `approvals.id`, governance traceability)
   - `rejection_reason` (text nullable)
   - `kpi_targets` (jsonb, the month's target KPIs)
   - `created_by_user_id` (varchar 255)
   - `created_at`, `updated_at`

2. **`marketing_plan_themes`**: weekly themes
   - `id` (UUID PK)
   - `plan_id` (UUID FK -> `marketing_plans.id` ON DELETE CASCADE)
   - `company_id` (UUID FK -> `companies.id` ON DELETE CASCADE)
   - `week_number` (integer 1-52)
   - `title` (varchar 200, e.g. *"Week 1: Awareness and Problem Identification"*)
   - `description` (text)
   - `focus_persona_id` (UUID nullable FK -> `brand_personas.id`)
   - `focus_product_id` (UUID nullable FK -> `brand_products.id`)
   - `allocated_budget` (integer, share of the total budget)
   - `target_kpi` (varchar 255, e.g. *"50,000 qualified impressions"*)
   - `order_index` (integer)

3. **`marketing_plan_proposals`**: concrete campaign proposals
   - `id` (UUID PK)
   - `plan_id` (UUID FK -> `marketing_plans.id` ON DELETE CASCADE)
   - `theme_id` (UUID FK -> `marketing_plan_themes.id` ON DELETE CASCADE)
   - `company_id` (UUID FK -> `companies.id` ON DELETE CASCADE)
   - `title` (varchar 255)
   - `channel` (varchar 50)
   - `format` (varchar 50, e.g. *"Video 16:9"*, *"Short 9:16"*, *"Carousel Post"*)
   - `angle` (text, strategic marketing angle)
   - `hook` (text, hook to capture attention)
   - `call_to_action` (text, action expected from the audience)
   - `estimated_cost` (integer)
   - `target_audience` (varchar 255)
   - `campaign_id` (UUID nullable FK -> `studio_campaigns.id`, link to the campaign created)
   - `status` (`suggested` | `accepted` | `rejected` | `converted`)

---

## 2. Automated plan generator

The `generateMarketingPlan(db, companyId, input, userId)` service:
1. Extracts the client's full **Brand Memory** context (profile, offers with pricing, persona profiles, handled objections).
2. Splits the target month into 4 weekly strategic milestones:
   - **Week 1 — Awareness**: education about the target persona's major problems, 25% of the budget.
   - **Week 2 — Value demonstration**: focus on the value proposition and the product's features, 30% of the budget.
   - **Week 3 — Social proof and objections**: demystifying fears through answers and figures, 25% of the budget.
   - **Week 4 — Conversion and acceleration**: a push to act with offers and guarantees, 20% of the budget.
3. Generates targeted campaign proposals combining the chosen channels (`LinkedIn`, `YouTube`, `TikTok`), video formats and hooks based on real facts.
4. Rigorously balances the budget envelope: the sum of the weekly budgets equals exactly the total budget set by the operator.

---

## 3. Editability and human governance

### Continuous editing
Every plan, theme or proposal can be modified, reordered or completed manually through the REST endpoints and the user interface:
- `PUT /api/companies/:companyId/studio/plans/:planId`
- `POST/PUT/DELETE /api/companies/:companyId/studio/plans/:planId/themes`
- `POST/PUT/DELETE /api/companies/:companyId/studio/plans/:planId/proposals`

### Validation gate
In line with SORAVYN's governance principles:
1. The plan is initialized with the `draft` status.
2. The operator submits the plan for validation: `POST /api/companies/:companyId/studio/plans/:planId/submit-validation`.
3. An approval request is created in the `approvals` table (`type: "marketing_plan_validation"`).
4. Management or the authorized operator resolves the approval: `POST /api/companies/:companyId/studio/plans/:planId/resolve-approval`.
   - If `approved`: the status becomes `approved`, unlocking the plan for conversion and execution.
   - If `rejected`: the status becomes `rejected`, returning the plan to revision with the reason recorded.

---

## 4. One-click conversion to Campaign Studio

Each approved proposal can be turned directly into an operational campaign:
- Call: `POST /api/companies/:companyId/studio/plans/:planId/proposals/:proposalId/convert`
- Immediately creates a record in `studio_campaigns` with name, objectives, audience, channel and a pre-filled full brief.
- Links the proposal to the new campaign (`status: "converted"`, `campaignId: id`).
- Prevents any unintended double conversion (`409 Conflict`).

---

## 5. Tests

- **Contract and schema unit tests**: `server/src/__tests__/marketing-plan.test.ts`.
- **Route isolation and security tests**: `server/src/__tests__/marketing-plan-routes.test.ts`.
- **End-to-end smoke test**: `scripts/verification/marketing-plan-smoke.ts` (against a real PostgreSQL).
