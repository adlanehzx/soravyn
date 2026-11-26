# Editorial Calendar and Multi-Channel Distribution

SORAVYN's **Editorial Calendar** module provides unified planning of all marketing content (videos, social posts, newsletters/emails, blog articles). It integrates with the **Marketing Plan generator** and with **Studio campaigns** to offer a consolidated, chronological, multi-channel view of scheduled publications.

---

## 1. Data model and multi-tenant isolation

All editorial calendar entities respect strict per-client isolation (`company_id`) with deletion cascades and server-side access controls.

### PostgreSQL table: `editorial_calendar_items` (`@soravyn/db`)

```sql
CREATE TABLE IF NOT EXISTS "editorial_calendar_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "plan_id" uuid REFERENCES "marketing_plans"("id") ON DELETE SET NULL,
  "proposal_id" uuid REFERENCES "marketing_plan_proposals"("id") ON DELETE SET NULL,
  "campaign_id" uuid REFERENCES "studio_campaigns"("id") ON DELETE SET NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "content_type" varchar(50) NOT NULL DEFAULT 'video',
  "channel" varchar(50) NOT NULL,
  "target_audience" varchar(255),
  "scheduled_at" timestamp with time zone NOT NULL,
  "status" varchar(50) NOT NULL DEFAULT 'draft',
  "asset_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_by_user_id" varchar(255),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

#### Supported types
- **`content_type`**: `video` | `social_post` | `email` | `article` | `ad`
- **`channel`**: `LinkedIn` | `YouTube` | `TikTok` | `Instagram` | `Twitter/X` | `Newsletter` | `Blog` | `Facebook`
- **`status`**: `draft` ➔ `scheduled` ➔ `in_production` ➔ `ready_for_review` ➔ `approved` ➔ `published` (or `archived`)

---

## 2. Automatic generation from the Marketing Plan

The `generateCalendarFromPlan` service takes a validated marketing plan and automatically projects its campaign proposals over the 4 weeks of the month:

1. Detection of the target month (`YYYY-MM`).
2. Computation of the optimal time slots per channel:
   - **LinkedIn**: 09:00 UTC (B2B engagement peak)
   - **YouTube**: 16:00 UTC
   - **TikTok / Instagram**: 18:00 UTC
   - **Newsletter / Email**: 10:00 UTC
   - **Blog**: 11:00 UTC
3. Even spreading of publications according to the week number (`week_number`).
4. Automatic association of the `proposal_id` and preservation of the metadata (hook, angle, CTA, estimated budget).

---

## 3. API architecture and security

All routes are prefixed with `/api/companies/:companyId/studio/calendar` and protected by `assertCompanyAccess`:

| Method | Route | Description | Validation |
|---|---|---|---|
| `GET` | `/` | Filtered list of items (by status, channel, type, period) | `editorialCalendarFilterSchema` |
| `GET` | `/stats` | Real-time statistical aggregation (by status, type, channel) | `periodMonth` query |
| `GET` | `/:itemId` | Detail of a calendar item | item UUID + company check |
| `POST` | `/` | Manual creation of a calendar entry | `createEditorialCalendarItemSchema` |
| `PUT` | `/:itemId` | Update of information, statuses or asset URLs | `updateEditorialCalendarItemSchema` |
| `DELETE` | `/:itemId` | Deletion of a calendar item | item UUID + company check |
| `POST` | `/generate-from-plan` | Bulk generation from a marketing plan | `generateCalendarFromPlanSchema` |

---

## 4. Studio interface (`EditorialCalendarPanel.tsx`)

The `EditorialCalendarPanel` React panel is reachable directly from Campaign Studio through the **"Editorial calendar"** tab (`calendar`):

- **Monthly grid view**: day-by-day display of scheduled content with channel pills and status badges.
- **Chronological list view**: sorted by ascending date with details (title, channel, media type, audience, linked campaign).
- **Header statistics**: real-time counters by media type (Videos, Posts, Emails, Articles) and by status.
- **Built-in generator**: action button to synchronize an approved marketing plan and instantly inject all the content into the grid.
- **Content inspector**: modal to change publication dates, update the lifecycle status and attach the final deliverables (video render URLs, carousels, etc.).

---

## 5. Tests

- **Service unit tests**: `server/src/__tests__/editorial-calendar.test.ts`.
- **Route integration tests**: `server/src/__tests__/editorial-calendar-routes.test.ts` (strict multi-tenant isolation and Zod validation).
- **End-to-end smoke test** (`scripts/verification/editorial-calendar-smoke.ts`), run against the embedded PostgreSQL database:
  ```bash
  ./server/node_modules/.bin/tsx scripts/verification/editorial-calendar-smoke.ts
  ```
  It checks strict isolation (a cross-company access attempt is rejected), the plan ➔ calendar projection, omnichannel diversity, the full lifecycle (`draft` ➔ `scheduled` ➔ `in_production` ➔ `ready_for_review` ➔ `approved` ➔ `published`) and the statistical aggregation.
