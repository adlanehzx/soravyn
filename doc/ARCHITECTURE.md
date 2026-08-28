# Audit initial SORAVYN

Snapshots : OpenSoul 32c1d1cbcb84bffbca39068367ef1ec33daa33c2 ; LLM Video Maker cee12add24317c50f8a9f9de93749089a59d9f99.

OpenSoul : pnpm, Express 5, React 19/Vite, Drizzle/PostgreSQL embarqué ou externe, Better Auth. Routes agents, companies, projects, issues, approvals, goals, costs, assets, secrets et activity. Préserver les adaptateurs workspace, les heartbeats et budgets. AGENTS.md indique PGlite mais DATABASE.md et les dépendances indiquent embedded-postgres. Le mode local_trusted donne le contrôle opérateur ; il ne garantit pas une isolation utilisateur/client.

LLM Video Maker fournit des skills et six scripts utilitaires : validation brief, analyse codebase, capture, assets, transcript, scènes. Aucun serveur ni générateur autonome complet : script, design, storyboard et composition sont produits par l'agent. HyperFrames 0.6.91 exact, Node >=22, FFmpeg et Chrome sont requis. edit-video conserve horloge/narration et refait tout le rendu après modification du chapitre.

Licences MIT racines vérifiées : Simhasana LLC et Harald Thorvald Hautin. Exemples médias exclus de la copie produit. Licences transitives, modèles TTS et assets restent à auditer individuellement. Node 26.8.1, pnpm 11.25.0, FFmpeg et Chromium disponibles. Aucun test ni rendu exécuté.
