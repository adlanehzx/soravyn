# SORAVYN

Autonomous Creative Intelligence — votre agence marketing et studio de production.

## Développement local

Node.js 22+ et pnpm requis.

```sh
pnpm install
pnpm dev
```

Le serveur et le dashboard partagent http://localhost:3200. PostgreSQL embarqué est utilisé sans DATABASE_URL. Le mode local donne le contrôle opérateur : ne pas exposer ce mode sur Internet.

```sh
pnpm -r typecheck
pnpm test:run
pnpm build
```

## État du produit

La coordination des agents provient du socle conservé. Un worker vidéo séparé produit désormais des MP4 HyperFrames depuis des scènes explicites, avec fichiers intermédiaires, validation humaine et livraison de campagne. Un rendu local réel a été vérifié. La voix locale eSpeak, les images client, les révisions de scènes et la bibliothèque sont intégrées. Le connecteur de scripts Ollama exige un modèle local configuré ; aucun modèle réel n’a été testé dans cet environnement. La refonte complète du dashboard reste en cours. Voir doc/VIDEO_WORKER.md pour les commandes et limites.

Documentation : [guide des documents](doc/README.md). Architecture : [doc/ARCHITECTURE.md](doc/ARCHITECTURE.md).

Licences et attributions : THIRD_PARTY_NOTICES.md et LICENSE.

## Workflow de campagne

Campaign Studio relie désormais les tâches des agents, les versions de stratégie/script/storyboard, les validations et les corrections au rendu vidéo. Le planning manuel, les mesures sourcées et le rapport client complètent la livraison. Voir doc/CAMPAIGN_WORKFLOW.md et doc/verification/campaign-workflow-summary.md pour les limites et preuves de vérification.

Les extensions du studio (packs créatifs locaux, textes marketing, marque, déclinaisons, portail client, budgets et audio) sont décrites avec leurs limites dans [doc/STUDIO_EXTENSIONS.md](doc/STUDIO_EXTENSIONS.md).

Les reprises par étape, les trois compositions vidéo et les aperçus isolés sont documentés dans [doc/PRODUCTION_RELIABILITY.md](doc/PRODUCTION_RELIABILITY.md).
