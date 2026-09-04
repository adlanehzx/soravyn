---
title: CLI Overview
summary: CLI installation and setup
---

The SORAVYN CLI handles instance setup, diagnostics, and control-plane operations.

## Usage

```sh
pnpm soravyn --help
```

## Global Options

All commands support:

| Flag | Description |
|------|-------------|
| `--data-dir <path>` | Local SORAVYN data root (isolates from `~/.soravyn`) |
| `--api-base <url>` | API base URL |
| `--api-key <token>` | API authentication token |
| `--context <path>` | Context file path |
| `--profile <name>` | Context profile name |
| `--json` | Output as JSON |

Company-scoped commands also accept `--company-id <id>`.

For clean local instances, pass `--data-dir` on the command you run:

```sh
pnpm soravyn run --data-dir ./tmp/soravyn-dev
```

## Context Profiles

Store defaults to avoid repeating flags:

```sh
# Set defaults
pnpm soravyn context set --api-base http://localhost:3200 --company-id <id>

# View current context
pnpm soravyn context show

# List profiles
pnpm soravyn context list

# Switch profile
pnpm soravyn context use default
```

To avoid storing secrets in context, use an env var:

```sh
pnpm soravyn context set --api-key-env-var-name SORAVYN_API_KEY
export SORAVYN_API_KEY=...
```

Context is stored at `~/.soravyn/context.json`.

## Command Categories

The CLI has two categories:

1. **[Setup commands](/cli/setup-commands)** — instance bootstrap, diagnostics, configuration
2. **[Control-plane commands](/cli/control-plane-commands)** — issues, agents, approvals, activity
