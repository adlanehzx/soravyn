# SORAVYN initial audit

Snapshots: OpenSoul 32c1d1cbcb84bffbca39068367ef1ec33daa33c2; LLM Video Maker cee12add24317c50f8a9f9de93749089a59d9f99.

OpenSoul: pnpm, Express 5, React 19/Vite, Drizzle/PostgreSQL (embedded or external), Better Auth. Routes for agents, companies, projects, issues, approvals, goals, costs, assets, secrets and activity. Preserve the workspace adapters, heartbeats and budgets. AGENTS.md mentions PGlite but DATABASE.md and the dependencies indicate embedded-postgres. The local_trusted mode grants operator control; it does not guarantee user/client isolation.

LLM Video Maker provides skills and six utility scripts: brief validation, codebase analysis, capture, assets, transcript, scenes. There is no server and no complete autonomous generator: script, design, storyboard and composition are produced by the agent. HyperFrames 0.6.91 exactly, Node >=22, FFmpeg and Chrome are required. edit-video keeps the clock/narration and redoes the whole render after a chapter is modified.

Root MIT licenses verified: Simhasana LLC and Harald Thorvald Hautin. Media examples were excluded from the product copy. Transitive licenses, TTS models and assets remain to be audited individually. Node 26.8.1, pnpm 11.25.0, FFmpeg and Chromium available. No test or render was run.
