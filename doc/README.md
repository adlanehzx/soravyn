# Documentation essentielle

## Installer et exploiter

- [Développement local](DEVELOPING.md)
- [Gouvernance, rôles, budgets et reprise des tâches](GOVERNANCE.md)
- [Base de données](DATABASE.md)
- [Docker](DOCKER.md)
- [Authentification et exposition](DEPLOYMENT-MODES.md)
- [Commandes CLI](CLI.md)

## Utiliser et comprendre le studio

- [Campagnes, validations et livraison](CAMPAIGN_WORKFLOW.md)
- [Worker vidéo, prérequis et limites](VIDEO_WORKER.md)
- [Architecture et composants réutilisés](ARCHITECTURE.md)
- [Invariants de développement](SPEC-implementation.md)
- [Compatibilité des installations existantes](IDENTITY_MIGRATION.md)

- [Extensions : création IA, textes, marque, revue client et budgets](STUDIO_EXTENSIONS.md)

- [Reprises de production, compositions et narration](PRODUCTION_RELIABILITY.md)

## Vérification et références

- [Bilan des vérifications du workflow](verification/campaign-workflow-summary.md)
- [Vérification de l’identité](verification/identity-rebrand.md)
- Les fichiers JSON dans `verification/` conservent les résultats des contrôles exécutés. Les scripts correspondants restent dans `scripts/verification/`.
- `docs/` contient le site de référence : API, adaptateurs, guides opérateur et configuration.
- Les licences et attributions restent dans [LICENSE](../LICENSE) et [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

Les skills des agents et du moteur vidéo restent dans `skills/` et `vendor/llm-video-maker/skills/` : ils participent au fonctionnement du produit.
