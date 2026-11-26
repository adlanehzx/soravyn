# Governance and operations

## Agent control

The Governance page is reserved for workspace administrators. Migration 0034 adds the policies, execution permits, resume points and operating rules. New accounts no longer become instance administrators: only the first account can bootstrap this role. Existing global administrators are kept and must be reviewed explicitly.

A policy can block an agent, allow an isolated `process` command, or approve a trusted adapter. The workspace's strict mode refuses agents without a policy. It is disabled by default to preserve existing installations; operating warnings flag the agents that are not covered.

Isolated mode launches Docker with no network, a read-only root, a folder dedicated to the client and the agent, CPU/RAM/process limits and a maximum timeout. Only explicitly approved variables are passed through. The available commands are those of the video image. Trusted native adapters are not isolated from the host system; they require an explicit approval and a positive monthly budget. A policy requires an identified task by default. A context task must be assigned to the agent and not be completed.

API capabilities are checked on the server side for agents that have a policy. Known secrets are masked even when they span several log fragments. This filter does not detect every possible transformation of a secret.

## Human task resumption

An agent can record a checkpoint through `POST /api/issues/:id/checkpoints` during its active run, or emit a line `SORAVYN_CHECKPOINT:{"summary":"…","output":{"completed":[],"nextActions":[],"notes":"…"}}` in its output. The fields are bounded and validated; this content remains untrusted data.

The administrator inspects the interrupted task, then confirms any external effects and costs before resuming. Resumption keeps the trace of the source run and passes on the last checkpoint. It refuses duplicates and does not automatically resume a completed task or a suspended agent. It does not guarantee the idempotence of external tools: without a checkpoint, human verification of the actions already performed remains necessary.

## Roles and deliverables

- Administrator: workspace configuration, policies and members.
- Project manager: campaigns, budgets, production and internal approval.
- Creative: creation and revision, without internal approval or administration.
- Client: approved texts and videos only, through a dedicated view.

The controls apply to the backend, to files and to the real-time channel. An instance administrator keeps a global access distinct from the workspace roles. The `local_trusted` mode is a local operator mode and must not be exposed publicly.

The deterministic quality check flags placeholders, repetitions, figures absent from the supplied context and absolute promises. It does not invent a score and does not verify the truth of claims. An approval that contains unfinished-content errors requires an explicit justification.

## Budgets and concurrency

Declared costs and the unconsumed part of reservations are counted only once. From a campaign, an authorization can be renewed: the amount entered represents the task's new available amount, added to its already declared spending. Exceeding the envelope is refused. Agent tasks attached to a capped campaign require an active reservation, including from a generic wake-up.

Agent admission uses a shared transactional lock and persistent permits; the global and per-workspace quotas apply to all processes. Video workers also use transactional admission. The global defaults are 8 agents and 2 video productions; the workspace limits are configurable.

The amounts are those declared to SORAVYN: a provider invoice may arrive late or exceed an estimate during a run. These limits do not replace the provider's caps and do not stop a request that has already been billed. The verification costs declared by the scripts are explicitly fixtures, with no paid call.

## Operations, retention and backups

The page shows recent failures, missing or trusted policies, active permits and intermediate files that have expired. Archiving is manual and reversible: the files of failed or cancelled jobs, audio or old previews are moved to `.retention/<companyId>/`. Final MP4s are excluded. No automatic permanent purge or external notification is implemented. The governance console and the API (`GET /operations/archives`, `POST /operations/retention/:jobId/restore`) make it possible to list the reversible archives and restore their files with explicit confirmation, under strict workspace isolation.

SQL backups now use `pg_dump`, with a private temporary file and atomic publication. Install a PostgreSQL client compatible with the server version; `SORAVYN_PG_DUMP_PATH` lets you choose the binary. The password is passed through the environment, not in the arguments. The SQL backup contains neither the video files nor the encryption key: also back up the storage and the master key separately, with access control.

The restore test creates a separate temporary database, restores the dump into it, checks data, constraints, indexes and the migration journal, then deletes only that database. It never restores onto the source database.

## Reproducible checks

The governance scripts create test workspaces, users and tasks. Run them only on a verification installation; they do not delete these fixtures. The generated sessions and passwords stay in `/tmp`, outside the repository, in private mode.

```sh
pnpm -r --workspace-concurrency=1 typecheck
pnpm test:run
pnpm build
# Two test APIs, local on 3206 and authenticated on 3205, are required:
node scripts/verification/governance-smoke.mjs
node scripts/verification/governance-concurrency-smoke.mjs
node scripts/verification/budget-reconciliation-smoke.mjs
```

The local model check used `qwen2.5:1.5b` (Ollama, external Apache-2.0 model). Install the model separately, then configure `SORAVYN_OLLAMA_MODEL=qwen2.5:1.5b` in the API and the worker. No consumer subscription implicitly provides an API. The verified result is a four-step pack with three texts; editorial quality remains to be validated by a human.
