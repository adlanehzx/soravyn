# SORAVYN — Publishing and omnichannel distribution connectors

## 1. Overview

The distribution engine is SORAVYN Studio's autonomous and secure publishing component. It connects the validated slots of the editorial calendar (`editorial_calendar_items`) to external distribution channels (LinkedIn, YouTube, TikTok, X, CMS, Zapier/Make automation webhooks).

---

## 2. Architecture and components

### 2.1 Data model (`packages/db/src/schema/distribution.ts`)
- **`distribution_channels`**: records the omnichannel connectors configured per company (`channel_type`: `linkedin`, `youtube`, `tiktok`, `x`, `webhook`, `cms`), with state (`active`, `paused`, `error`), endpoints, HTTP headers and encrypted/protected authentication settings.
- **`distribution_logs`**: immutable audit trail of every dispatch (payload sent, remote API response, HTTP code, external identifier `external_post_id`, final viewing URL `external_post_url` and `dispatched_at` timestamp).

### 2.2 Security lock and governance (`server/src/services/distribution.ts`)
- **Strict pre-publication check**: the engine flatly refuses to publish content whose status is not `approved` (or `ready_for_review` / `scheduled`). Any `draft` content, or content not validated by a decision maker, raises a 400 exception.
- **HMAC SHA-256 signature**: for webhooks and secure integrations, a dynamic payload signature is injected in the `X-Soravyn-Signature` header.
- **External URL adapters**: automatic construction and resolution of remote permalinks according to the channel (`linkedin.com/feed/update/...`, `youtube.com/watch?v=...`, `tiktok.com/@brand/video/...`, `x.com/brand/status/...`).

### 2.3 Express API routes (`server/src/routes/distribution.ts`)
- `GET /api/companies/:companyId/distribution/channels`: list of the channels configured for the company.
- `POST /api/companies/:companyId/distribution/channels`: configuration of a new distribution channel.
- `PATCH /api/companies/:companyId/distribution/channels/:channelId`: change of settings or deactivation.
- `DELETE /api/companies/:companyId/distribution/channels/:channelId`: removal of a connector.
- `POST /api/companies/:companyId/distribution/channels/:channelId/test`: live connectivity test and latency measurement.
- `POST /api/companies/:companyId/distribution/calendar/:itemId/publish`: one-click publication trigger.
- `GET /api/companies/:companyId/distribution/logs`: consultation of the distribution audit logs.

### 2.4 User interface (`ui/src/components/EditorialCalendarPanel.tsx`)
- **`🚀 Publish` action button**: visible on validated content (`status === 'approved'`), with a real-time progress indicator (`⏳ Dispatch...`).
- **`🔗 Live` external link**: available as soon as a content item reaches the `published` status with its remote URL.

---

## 3. Tests

- **Unit tests** (`server/src/__tests__/distribution.test.ts`): governance lock, single dispatch, URL mapping.
- **Route and permission tests** (`server/src/__tests__/distribution-routes.test.ts`): multi-tenant isolation (403), Zod validation.
- **End-to-end PostgreSQL smoke test** (`scripts/verification/distribution-smoke.ts`): full distribution cycle against a real PostgreSQL instance, blocking of `draft` content (governance violation), switch to `published`, audit log entry and cross-company isolation.
