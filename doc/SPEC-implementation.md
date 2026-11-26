# Implementation invariants

This document describes the rules to preserve. Detailed contracts are in the schemas, validators, services and tests of the monorepo.

## Data and permissions

- Every business resource belongs to a company. Cross-references are checked on the server side.
- Agent keys are stored as hashes and limited to their company.
- Deployment modes and operator scope are described in [DEPLOYMENT-MODES.md](DEPLOYMENT-MODES.md).
- Secrets are referenced and encrypted with the configured provider; they must not appear in responses or logs.

## Orchestration

- A task has a single owner. Atomic checkout protects against concurrent claims.
- Runs, decisions and mutations must remain traceable.
- Reported consumption feeds the monthly budgets; their threshold can suspend agents. This mechanism does not guarantee a cap on an unknown provider invoice.
- Paid operations in campaign steps require the explicit authorization provided by the workflow.

## Campaigns and video

- The brief and the brand are frozen when the governed workflow starts.
- Strategy, script and storyboard have versions and explicit approvals. A rejection creates a correction task.
- Only the current approved storyboard starts governed production.
- Video jobs are persisted, reserved with a lease and run in a separate worker and a restricted container.
- A cancellation or a lost lease prevents late publication of the result.
- Delivery requires approval of the current video version. Scheduling and delivery confirmation are manual; no automatic social publishing is implemented.

See [CAMPAIGN_WORKFLOW.md](CAMPAIGN_WORKFLOW.md) and [VIDEO_WORKER.md](VIDEO_WORKER.md) for behaviors and limits.

## Evolution and verification

Drizzle migrations are the source of database changes. Keep the compatibility of existing installations documented in [IDENTITY_MIGRATION.md](IDENTITY_MIGRATION.md).

Run the typecheck, the tests and the build after changes. Real HTTP checks and renders must be distinguished from fixtures and simulated models in verification reports.
