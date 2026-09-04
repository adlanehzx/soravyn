---
title: Docker
summary: Docker Compose quickstart
---

Run SORAVYN in Docker without installing Node or pnpm locally.

## Compose Quickstart (Recommended)

```sh
docker compose -f docker-compose.quickstart.yml up --build
```

Open [http://localhost:3200](http://localhost:3200).

Defaults:

- Host port: `3200`
- Data directory: `./data/docker-soravyn`

Override with environment variables:

```sh
SORAVYN_PORT=3200 SORAVYN_DATA_DIR=./data/pc \
  docker compose -f docker-compose.quickstart.yml up --build
```

## Manual Docker Build

```sh
docker build -t soravyn-local .
docker run --name soravyn \
  -p 3200:3200 \
  -e HOST=0.0.0.0 \
  -e SORAVYN_HOME=/soravyn \
  -v "$(pwd)/data/docker-soravyn:/soravyn" \
  soravyn-local
```

## Data Persistence

All data is persisted under the bind mount (`./data/docker-soravyn`):

- Embedded PostgreSQL data
- Uploaded assets
- Local secrets key
- Agent workspace data

## Claude and Codex Adapters in Docker

The Docker image pre-installs:

- `claude` (Anthropic Claude Code CLI)
- `codex` (OpenAI Codex CLI)

Pass API keys to enable local adapter runs inside the container:

```sh
docker run --name soravyn \
  -p 3200:3200 \
  -e HOST=0.0.0.0 \
  -e SORAVYN_HOME=/soravyn \
  -e OPENAI_API_KEY=sk-... \
  -e ANTHROPIC_API_KEY=sk-... \
  -v "$(pwd)/data/docker-soravyn:/soravyn" \
  soravyn-local
```

Without API keys, the app runs normally — adapter environment checks will surface missing prerequisites.
