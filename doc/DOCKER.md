# Docker Quickstart

Run SORAVYN in Docker without installing Node or pnpm locally.

## One-liner (build + run)

```sh
docker build -t soravyn-local . && \
docker run --name soravyn \
  -p 3200:3200 \
  -e HOST=0.0.0.0 \
  -e SORAVYN_HOME=/soravyn \
  -v "$(pwd)/data/docker-soravyn:/soravyn" \
  soravyn-local
```

Open: `http://localhost:3200`

Data persistence:

- Embedded PostgreSQL data
- uploaded assets
- local secrets key
- local agent workspace data

All persisted under your bind mount (`./data/docker-soravyn` in the example above).

## Compose Quickstart

```sh
docker compose -f docker-compose.quickstart.yml up --build
```

Defaults:

- host port: `3200`
- persistent data dir: `./data/docker-soravyn`

Optional overrides:

```sh
SORAVYN_PORT=3200 SORAVYN_DATA_DIR=./data/pc docker compose -f docker-compose.quickstart.yml up --build
```

If you change host port or use a non-local domain, set `SORAVYN_PUBLIC_URL` to the external URL you will use in browser/auth flows.

## Authenticated Compose (Single Public URL)

For authenticated deployments, set one canonical public URL and let SORAVYN derive auth/callback defaults:

```yaml
services:
  soravyn:
    environment:
      SORAVYN_DEPLOYMENT_MODE: authenticated
      SORAVYN_DEPLOYMENT_EXPOSURE: private
      SORAVYN_PUBLIC_URL: https://desk.koker.net
```

`SORAVYN_PUBLIC_URL` is used as the primary source for:

- auth public base URL
- Better Auth base URL defaults
- bootstrap invite URL defaults
- hostname allowlist defaults (hostname extracted from URL)

Granular overrides remain available if needed (`SORAVYN_AUTH_PUBLIC_BASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS`, `SORAVYN_ALLOWED_HOSTNAMES`).

Set `SORAVYN_ALLOWED_HOSTNAMES` explicitly only when you need additional hostnames beyond the public URL host (for example Tailscale/LAN aliases or multiple private hostnames).

## Claude + Codex Local Adapters in Docker

The image pre-installs:

- `claude` (Anthropic Claude Code CLI)
- `codex` (OpenAI Codex CLI)

If you want local adapter runs inside the container, pass API keys when starting the container:

```sh
docker run --name soravyn \
  -p 3200:3200 \
  -e HOST=0.0.0.0 \
  -e SORAVYN_HOME=/soravyn \
  -e OPENAI_API_KEY=... \
  -e ANTHROPIC_API_KEY=... \
  -v "$(pwd)/data/docker-soravyn:/soravyn" \
  soravyn-local
```

Notes:

- Without API keys, the app still runs normally.
- Adapter environment checks in SORAVYN will surface missing auth/CLI prerequisites.

## Onboard Smoke Test (Ubuntu + npm only)

Use this when you want to mimic a fresh machine that only has Ubuntu + npm and verify:

- `pnpm soravyn onboard --yes` completes
- the server binds to `0.0.0.0:3200` so host access works
- onboard/run banners and startup logs are visible in your terminal

Build + run:

```sh
./scripts/docker-onboard-smoke.sh
```

Open: `http://localhost:3131` (default smoke host port)

Useful overrides:

```sh
HOST_PORT=3200 SORAVYNAI_VERSION=latest ./scripts/docker-onboard-smoke.sh
SORAVYN_DEPLOYMENT_MODE=authenticated SORAVYN_DEPLOYMENT_EXPOSURE=private ./scripts/docker-onboard-smoke.sh
```

Notes:

- Persistent data is mounted at `./data/docker-onboard-smoke` by default.
- Container runtime user id defaults to your local `id -u` so the mounted data dir stays writable while avoiding root runtime.
- Smoke script defaults to `authenticated/private` mode so `HOST=0.0.0.0` can be exposed to the host.
- Smoke script defaults host port to `3131` to avoid conflicts with local SORAVYN on `3200`.
- Run the script in the foreground to watch the onboarding flow; stop with `Ctrl+C` after validation.
- The image definition is in `Dockerfile.onboard-smoke`.
