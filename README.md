# SORAVYN

![Verify](https://github.com/adlanehzx/soravyn/actions/workflows/verify.yml/badge.svg)

Autonomous Creative Intelligence — your marketing agency and production studio.

## Local development

Node.js 22+ and pnpm are required.

```sh
pnpm install
pnpm dev
```

The server and the dashboard share http://localhost:3200. Embedded PostgreSQL is used when `DATABASE_URL` is not set. Local mode grants operator control: do not expose this mode to the Internet.

```sh
pnpm -r typecheck
pnpm test:run
pnpm build
```

## Product status

Agent coordination comes from the retained base. A separate video worker now produces HyperFrames MP4s from explicit scenes, with intermediate files, human approval and campaign delivery. A real local render has been verified. The local eSpeak voice, client images, scene revisions and the library are integrated. The Ollama script connector requires a configured local model; a complete pack was generated and verified with the local Qwen2.5 1.5B model through Ollama, without any paid provider. Governance was checked in Chromium at 1280 and 390 px; the full browser verification remains partial. See doc/VIDEO_WORKER.md for the commands and limits.

Documentation: [documentation guide](doc/README.md). Architecture: [doc/ARCHITECTURE.md](doc/ARCHITECTURE.md).

Licenses and attributions: THIRD_PARTY_NOTICES.md and LICENSE.

## Campaign workflow

Campaign Studio now links agent tasks, strategy/script/storyboard versions, approvals and corrections to the video render. Manual scheduling, sourced metrics and the client report complete the delivery. See doc/CAMPAIGN_WORKFLOW.md for the limits.

The studio extensions (local creative packs, marketing copy, brand, variations, client portal, budgets and audio) are described with their limits in [doc/STUDIO_EXTENSIONS.md](doc/STUDIO_EXTENSIONS.md).

Step-by-step resumption, the three video compositions and isolated previews are documented in [doc/PRODUCTION_RELIABILITY.md](doc/PRODUCTION_RELIABILITY.md).

Agent control, roles, task resumption, reconciled budgets and backups are described in [doc/GOVERNANCE.md](doc/GOVERNANCE.md), with their explicit limits.

The [experimental local Google Flow connector](doc/FLOW_CONNECTOR.md) adds a queue and a browser worker. A first real Flow generation was verified and imported. The full automatic worker path remains to be validated separately.
