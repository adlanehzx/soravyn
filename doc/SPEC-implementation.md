# Invariants d’implémentation

Ce document décrit les règles à préserver. Les contrats détaillés sont dans les schémas, validateurs, services et tests du monorepo.

## Données et permissions

- Chaque ressource métier appartient à une company. Les références croisées sont vérifiées côté serveur.
- Les clés d’agent sont stockées sous forme de hash et limitées à leur company.
- Les modes de déploiement et la portée des opérateurs sont décrits dans [DEPLOYMENT-MODES.md](DEPLOYMENT-MODES.md).
- Les secrets sont référencés et chiffrés avec le fournisseur configuré ; ils ne doivent pas apparaître dans les réponses ou journaux.

## Orchestration

- Une tâche possède un seul responsable. Le checkout atomique protège des prises concurrentes.
- Les exécutions, décisions et mutations doivent rester traçables.
- Les consommations rapportées alimentent les budgets mensuels ; leur seuil peut suspendre les agents. Ce mécanisme ne garantit pas un plafond sur une facture fournisseur inconnue.
- Les opérations payantes des étapes de campagne nécessitent l’autorisation explicite prévue par le workflow.

## Campagnes et vidéo

- Le brief et la marque sont figés au démarrage du workflow gouverné.
- Stratégie, script et storyboard ont des versions et des validations explicites. Un refus crée un travail de correction.
- Seul le storyboard courant approuvé lance la production gouvernée.
- Les jobs vidéo sont persistés, réservés avec un lease et exécutés dans un worker séparé et un conteneur restreint.
- Une annulation ou un lease perdu interdit la publication tardive du résultat.
- La livraison exige la validation de la version vidéo courante. La planification et la confirmation de livraison sont manuelles ; aucune publication sociale automatique n’est implémentée.

Voir [CAMPAIGN_WORKFLOW.md](CAMPAIGN_WORKFLOW.md) et [VIDEO_WORKER.md](VIDEO_WORKER.md) pour les comportements et limites.

## Évolution et vérification

Les migrations Drizzle sont la source des évolutions de base. Conserver la compatibilité des installations existantes documentée dans [IDENTITY_MIGRATION.md](IDENTITY_MIGRATION.md).

Exécuter le typecheck, les tests et le build après les changements. Les contrôles HTTP et rendus réels doivent être distingués des fixtures et modèles simulés dans les rapports de vérification.
