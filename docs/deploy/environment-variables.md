---
title: Environment Variables
summary: Full environment variable reference
---

All environment variables that SORAVYN uses for server configuration.

## Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3200` | Server port |
| `HOST` | `127.0.0.1` | Server host binding |
| `DATABASE_URL` | (embedded) | PostgreSQL connection string |
| `SORAVYN_HOME` | `~/.soravyn` | Base directory for all SORAVYN data |
| `SORAVYN_INSTANCE_ID` | `default` | Instance identifier (for multiple local instances) |
| `SORAVYN_DEPLOYMENT_MODE` | `local_trusted` | Runtime mode override |

## Secrets

| Variable | Default | Description |
|----------|---------|-------------|
| `SORAVYN_SECRETS_MASTER_KEY` | (from file) | 32-byte encryption key (base64/hex/raw) |
| `SORAVYN_SECRETS_MASTER_KEY_FILE` | `~/.soravyn/.../secrets/master.key` | Path to key file |
| `SORAVYN_SECRETS_STRICT_MODE` | `false` | Require secret refs for sensitive env vars |

## Agent Runtime (Injected into agent processes)

These are set automatically by the server when invoking agents:

| Variable | Description |
|----------|-------------|
| `SORAVYN_AGENT_ID` | Agent's unique ID |
| `SORAVYN_COMPANY_ID` | Company ID |
| `SORAVYN_API_URL` | SORAVYN API base URL |
| `SORAVYN_API_KEY` | Short-lived JWT for API auth |
| `SORAVYN_RUN_ID` | Current heartbeat run ID |
| `SORAVYN_TASK_ID` | Issue that triggered this wake |
| `SORAVYN_WAKE_REASON` | Wake trigger reason |
| `SORAVYN_WAKE_COMMENT_ID` | Comment that triggered this wake |
| `SORAVYN_APPROVAL_ID` | Resolved approval ID |
| `SORAVYN_APPROVAL_STATUS` | Approval decision |
| `SORAVYN_LINKED_ISSUE_IDS` | Comma-separated linked issue IDs |

## LLM Provider Keys (for adapters)

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key (for Claude Local adapter) |
| `OPENAI_API_KEY` | OpenAI API key (for Codex Local adapter) |
