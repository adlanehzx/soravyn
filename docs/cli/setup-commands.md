---
title: Setup Commands
summary: Onboard, run, doctor, and configure
---

Instance setup and diagnostics commands.

## `soravyn run`

One-command bootstrap and start:

```sh
pnpm soravyn run
```

Does:

1. Auto-onboards if config is missing
2. Runs `soravyn doctor` with repair enabled
3. Starts the server when checks pass

Choose a specific instance:

```sh
pnpm soravyn run --instance dev
```

## `soravyn onboard`

Interactive first-time setup:

```sh
pnpm soravyn onboard
```

First prompt:

1. `Quickstart` (recommended): local defaults (embedded database, no LLM provider, local disk storage, default secrets)
2. `Advanced setup`: full interactive configuration

Start immediately after onboarding:

```sh
pnpm soravyn onboard --run
```

Non-interactive defaults + immediate start (opens browser on server listen):

```sh
pnpm soravyn onboard --yes
```

## `soravyn doctor`

Health checks with optional auto-repair:

```sh
pnpm soravyn doctor
pnpm soravyn doctor --repair
```

Validates:

- Server configuration
- Database connectivity
- Secrets adapter configuration
- Storage configuration
- Missing key files

## `soravyn configure`

Update configuration sections:

```sh
pnpm soravyn configure --section server
pnpm soravyn configure --section secrets
pnpm soravyn configure --section storage
```

## `soravyn env`

Show resolved environment configuration:

```sh
pnpm soravyn env
```

## `soravyn allowed-hostname`

Allow a private hostname for authenticated/private mode:

```sh
pnpm soravyn allowed-hostname my-tailscale-host
```

## Local Storage Paths

| Data | Default Path |
|------|-------------|
| Config | `~/.soravyn/instances/default/config.json` |
| Database | `~/.soravyn/instances/default/db` |
| Logs | `~/.soravyn/instances/default/logs` |
| Storage | `~/.soravyn/instances/default/data/storage` |
| Secrets key | `~/.soravyn/instances/default/secrets/master.key` |

Override with:

```sh
SORAVYN_HOME=/custom/home SORAVYN_INSTANCE_ID=dev pnpm soravyn run
```

Or pass `--data-dir` directly on any command:

```sh
pnpm soravyn run --data-dir ./tmp/soravyn-dev
pnpm soravyn doctor --data-dir ./tmp/soravyn-dev
```
