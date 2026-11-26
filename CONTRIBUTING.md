# Contributing to SORAVYN

SORAVYN brings marketing operations and creative production together in a single application.

## Setup and verification

```sh
pnpm install
pnpm dev
pnpm -r typecheck
pnpm test:run
pnpm build
```

For the video engine, see doc/VIDEO_WORKER.md. Renders use a separate worker and a managed Docker image.

## Contribution rules

- Preserve company access controls on the server side.
- Keep models, migrations, API and interface in sync.
- Reuse the existing task, budget, approval and logging mechanisms.
- Never include a secret in sources or logs.
- Document partial capabilities and distinguish simulated tests from real executions.
- Keep the third-party component notices described in THIRD_PARTY_NOTICES.md.

Architecture: doc/ARCHITECTURE.md. Behavior and limits: doc/CAMPAIGN_WORKFLOW.md and doc/VIDEO_WORKER.md.
