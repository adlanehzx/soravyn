# Contribuer à SORAVYN

SORAVYN réunit les opérations marketing et la production créative dans une application.

## Installation et vérification

```sh
pnpm install
pnpm dev
pnpm -r typecheck
pnpm test:run
pnpm build
```

Pour le moteur vidéo : consulter doc/VIDEO_WORKER.md. Les rendus utilisent un worker séparé et une image Docker administrée.

## Règles de contribution

- Préserver les contrôles d’accès company côté serveur.
- Synchroniser modèles, migrations, API et interface.
- Réutiliser les mécanismes de tâches, budgets, approbations et journalisation.
- Ne jamais intégrer de secret aux sources ou aux logs.
- Documenter les capacités partielles et distinguer tests simulés et exécutions réelles.
- Conserver les notices des composants tiers décrites dans THIRD_PARTY_NOTICES.md.

Architecture : doc/ARCHITECTURE.md. Fonctionnement et limites : doc/CAMPAIGN_WORKFLOW.md et doc/VIDEO_WORKER.md.
