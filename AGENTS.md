# Contributing to SORAVYN

Read `README.md`, `doc/README.md`, `doc/SPEC-implementation.md` and the relevant guides before making a change.

- Keep data and permissions isolated per company on the server side.
- Keep schemas, migrations, shared contracts, API and interface in sync.
- Preserve atomic task checkout, human approvals, budgets and the audit log.
- Run renders in the isolated worker, never in the HTTP process.
- Do not expose secrets or present simulated results as real ones.
- Preserve third-party licenses and notices.
- Generate migrations with `pnpm db:generate`; do not rewrite applied migrations.

Before delivery: `pnpm -r typecheck`, `pnpm test:run`, `pnpm build`. Report the checks actually run and their limits.
