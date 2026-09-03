FROM node:lts-trixie-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl git && rm -rf /var/lib/apt/lists/*
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY cli/package.json cli/
COPY server/package.json server/
COPY ui/package.json ui/
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/adapter-utils/package.json packages/adapter-utils/
COPY packages/adapters/claude-local/package.json packages/adapters/claude-local/
COPY packages/adapters/codex-local/package.json packages/adapters/codex-local/
COPY packages/adapters/cursor-local/package.json packages/adapters/cursor-local/
COPY packages/adapters/openclaw-gateway/package.json packages/adapters/openclaw-gateway/
COPY packages/adapters/opencode-local/package.json packages/adapters/opencode-local/
COPY packages/adapters/pi-local/package.json packages/adapters/pi-local/
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/cli/node_modules ./cli/node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/ui/node_modules ./ui/node_modules
COPY --from=deps /app/packages ./packages
COPY . .
RUN pnpm --filter @soravyn/db generate
RUN pnpm --filter @soravyn/db build
RUN pnpm --filter @soravyn/shared build || true
RUN pnpm --filter @soravyn/adapter-utils build || true
RUN pnpm --filter @soravyn/adapter-claude-local build || true
RUN pnpm --filter @soravyn/adapter-codex-local build || true
RUN pnpm --filter @soravyn/adapter-cursor-local build || true
RUN pnpm --filter @soravyn/adapter-openclaw-gateway build || true
RUN pnpm --filter @soravyn/adapter-opencode-local build || true
RUN pnpm --filter @soravyn/adapter-pi-local build || true
RUN pnpm --filter @soravyn/ui build
RUN pnpm --filter @soravyn/server build
RUN test -f server/dist/index.js || (echo "ERROR: server build output missing" && exit 1)

RUN find packages -name "package.json" -exec sed -i -e 's|"./src/\(.*\)\.ts"|"./dist/\1.js"|g' {} +
RUN ls -la server/dist/ || echo "server/dist not found"

FROM node:20-bookworm-slim AS production
WORKDIR /app
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/node_modules ./server/node_modules
COPY --from=build /app/server/package.json ./server/
COPY --from=build /app/ui/dist ./ui/dist
COPY --from=build /app/ui/package.json ./ui/
COPY --from=build /app/packages ./packages
COPY --from=build /app/cli ./cli
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-workspace.yaml ./
COPY --from=build /app/pnpm-lock.yaml ./

RUN npm install --global --omit=dev @anthropic-ai/claude-code@latest @openai/codex@latest

ENV NODE_ENV=production \
  HOME=/soravyn \
  HOST=0.0.0.0 \
  PORT=3200 \
  SERVE_UI=true \
  SORAVYN_HOME=/soravyn \
  SORAVYN_INSTANCE_ID=default \
  SORAVYN_CONFIG=/soravyn/instances/default/config.json \
  SORAVYN_DEPLOYMENT_MODE=authenticated \
  SORAVYN_DEPLOYMENT_EXPOSURE=public

VOLUME ["/soravyn"]
RUN mkdir -p /soravyn/instances/default

EXPOSE 3200
CMD ["node", "--import", "./server/node_modules/tsx/dist/loader.mjs", "server/dist/index.js"]
