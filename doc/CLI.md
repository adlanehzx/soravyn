# CLI Reference

SORAVYN CLI now supports both:

- instance setup/diagnostics (`onboard`, `doctor`, `configure`, `env`, `allowed-hostname`)
- control-plane client operations (issues, approvals, agents, activity, dashboard)

## Base Usage

Use repo script in development:

```sh
pnpm soravyn --help
```

First-time local bootstrap + run:

```sh
pnpm soravyn run
```

Choose local instance:

```sh
pnpm soravyn run --instance dev
```

## Deployment Modes

Mode taxonomy and design intent are documented in `doc/DEPLOYMENT-MODES.md`.

Current CLI behavior:

- `soravyn onboard` and `soravyn configure --section server` set deployment mode in config
- runtime can override mode with `SORAVYN_DEPLOYMENT_MODE`
- `soravyn run` and `soravyn doctor` do not yet expose a direct `--mode` flag

Target behavior (planned) is documented in `doc/DEPLOYMENT-MODES.md` section 5.

Allow an authenticated/private hostname (for example custom Tailscale DNS):

```sh
pnpm soravyn allowed-hostname dotta-macbook-pro
```

All client commands support:

- `--data-dir <path>`
- `--api-base <url>`
- `--api-key <token>`
- `--context <path>`
- `--profile <name>`
- `--json`

Company-scoped commands also support `--company-id <id>`.

Use `--data-dir` on any CLI command to isolate all default local state (config/context/db/logs/storage/secrets) away from `~/.soravyn`:

```sh
pnpm soravyn run --data-dir ./tmp/soravyn-dev
pnpm soravyn issue list --data-dir ./tmp/soravyn-dev
```

## Context Profiles

Store local defaults in `~/.soravyn/context.json`:

```sh
pnpm soravyn context set --api-base http://localhost:3200 --company-id <company-id>
pnpm soravyn context show
pnpm soravyn context list
pnpm soravyn context use default
```

To avoid storing secrets in context, set `apiKeyEnvVarName` and keep the key in env:

```sh
pnpm soravyn context set --api-key-env-var-name SORAVYN_API_KEY
export SORAVYN_API_KEY=...
```

## Company Commands

```sh
pnpm soravyn company list
pnpm soravyn company get <company-id>
pnpm soravyn company delete <company-id-or-prefix> --yes --confirm <same-id-or-prefix>
```

Examples:

```sh
pnpm soravyn company delete PAP --yes --confirm PAP
pnpm soravyn company delete 5cbe79ee-acb3-4597-896e-7662742593cd --yes --confirm 5cbe79ee-acb3-4597-896e-7662742593cd
```

Notes:

- Deletion is server-gated by `SORAVYN_ENABLE_COMPANY_DELETION`.
- With agent authentication, company deletion is company-scoped. Use the current company ID/prefix (for example via `--company-id` or `SORAVYN_COMPANY_ID`), not another company.

## Issue Commands

```sh
pnpm soravyn issue list --company-id <company-id> [--status todo,in_progress] [--assignee-agent-id <agent-id>] [--match text]
pnpm soravyn issue get <issue-id-or-identifier>
pnpm soravyn issue create --company-id <company-id> --title "..." [--description "..."] [--status todo] [--priority high]
pnpm soravyn issue update <issue-id> [--status in_progress] [--comment "..."]
pnpm soravyn issue comment <issue-id> --body "..." [--reopen]
pnpm soravyn issue checkout <issue-id> --agent-id <agent-id> [--expected-statuses todo,backlog,blocked]
pnpm soravyn issue release <issue-id>
```

## Agent Commands

```sh
pnpm soravyn agent list --company-id <company-id>
pnpm soravyn agent get <agent-id>
pnpm soravyn agent local-cli <agent-id-or-shortname> --company-id <company-id>
```

`agent local-cli` is the quickest way to run local Claude/Codex manually as a SORAVYN agent:

- creates a new long-lived agent API key
- installs missing SORAVYN skills into `~/.codex/skills` and `~/.claude/skills`
- prints `export ...` lines for `SORAVYN_API_URL`, `SORAVYN_COMPANY_ID`, `SORAVYN_AGENT_ID`, and `SORAVYN_API_KEY`

Example for shortname-based local setup:

```sh
pnpm soravyn agent local-cli codexcoder --company-id <company-id>
pnpm soravyn agent local-cli claudecoder --company-id <company-id>
```

## Approval Commands

```sh
pnpm soravyn approval list --company-id <company-id> [--status pending]
pnpm soravyn approval get <approval-id>
pnpm soravyn approval create --company-id <company-id> --type hire_agent --payload '{"name":"..."}' [--issue-ids <id1,id2>]
pnpm soravyn approval approve <approval-id> [--decision-note "..."]
pnpm soravyn approval reject <approval-id> [--decision-note "..."]
pnpm soravyn approval request-revision <approval-id> [--decision-note "..."]
pnpm soravyn approval resubmit <approval-id> [--payload '{"...":"..."}']
pnpm soravyn approval comment <approval-id> --body "..."
```

## Activity Commands

```sh
pnpm soravyn activity list --company-id <company-id> [--agent-id <agent-id>] [--entity-type issue] [--entity-id <id>]
```

## Dashboard Commands

```sh
pnpm soravyn dashboard get --company-id <company-id>
```

## Heartbeat Command

`heartbeat run` now also supports context/api-key options and uses the shared client stack:

```sh
pnpm soravyn heartbeat run --agent-id <agent-id> [--api-base http://localhost:3200] [--api-key <token>]
```

## Local Storage Defaults

Default local instance root is `~/.soravyn/instances/default`:

- config: `~/.soravyn/instances/default/config.json`
- embedded db: `~/.soravyn/instances/default/db`
- logs: `~/.soravyn/instances/default/logs`
- storage: `~/.soravyn/instances/default/data/storage`
- secrets key: `~/.soravyn/instances/default/secrets/master.key`

Override base home or instance with env vars:

```sh
SORAVYN_HOME=/custom/home SORAVYN_INSTANCE_ID=dev pnpm soravyn run
```

## Storage Configuration

Configure storage provider and settings:

```sh
pnpm soravyn configure --section storage
```

Supported providers:

- `local_disk` (default; local single-user installs)
- `s3` (S3-compatible object storage)
