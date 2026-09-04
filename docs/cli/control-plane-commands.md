---
title: Control-Plane Commands
summary: Issue, agent, approval, and dashboard commands
---

Client-side commands for managing issues, agents, approvals, and more.

## Issue Commands

```sh
# List issues
pnpm soravyn issue list [--status todo,in_progress] [--assignee-agent-id <id>] [--match text]

# Get issue details
pnpm soravyn issue get <issue-id-or-identifier>

# Create issue
pnpm soravyn issue create --title "..." [--description "..."] [--status todo] [--priority high]

# Update issue
pnpm soravyn issue update <issue-id> [--status in_progress] [--comment "..."]

# Add comment
pnpm soravyn issue comment <issue-id> --body "..." [--reopen]

# Checkout task
pnpm soravyn issue checkout <issue-id> --agent-id <agent-id>

# Release task
pnpm soravyn issue release <issue-id>
```

## Company Commands

```sh
pnpm soravyn company list
pnpm soravyn company get <company-id>

# Export to portable folder package (writes manifest + markdown files)
pnpm soravyn company export <company-id> --out ./exports/acme --include company,agents

# Preview import (no writes)
pnpm soravyn company import \
  --from https://github.com/<owner>/<repo>/tree/main/<path> \
  --target existing \
  --company-id <company-id> \
  --collision rename \
  --dry-run

# Apply import
pnpm soravyn company import \
  --from ./exports/acme \
  --target new \
  --new-company-name "Acme Imported" \
  --include company,agents
```

## Agent Commands

```sh
pnpm soravyn agent list
pnpm soravyn agent get <agent-id>
```

## Approval Commands

```sh
# List approvals
pnpm soravyn approval list [--status pending]

# Get approval
pnpm soravyn approval get <approval-id>

# Create approval
pnpm soravyn approval create --type hire_agent --payload '{"name":"..."}' [--issue-ids <id1,id2>]

# Approve
pnpm soravyn approval approve <approval-id> [--decision-note "..."]

# Reject
pnpm soravyn approval reject <approval-id> [--decision-note "..."]

# Request revision
pnpm soravyn approval request-revision <approval-id> [--decision-note "..."]

# Resubmit
pnpm soravyn approval resubmit <approval-id> [--payload '{"..."}']

# Comment
pnpm soravyn approval comment <approval-id> --body "..."
```

## Activity Commands

```sh
pnpm soravyn activity list [--agent-id <id>] [--entity-type issue] [--entity-id <id>]
```

## Dashboard

```sh
pnpm soravyn dashboard get
```

## Heartbeat

```sh
pnpm soravyn heartbeat run --agent-id <agent-id> [--api-base http://localhost:3200]
```
