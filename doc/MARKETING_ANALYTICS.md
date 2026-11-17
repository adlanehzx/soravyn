# SORAVYN — Lot 7 : Analytics, Métriques & Brand Memory Feedback Loop

## 1. Vue d'Ensemble

Le **Lot 7** ferme la boucle cybernétique de SORAVYN Studio en transformant les données de diffusion réelles en apprentissage stratégique continu pour l'agence.
Les métriques collectées sur chaque post ou vidéo diffusée (portée, clics, likes, partages, commentaires, conversions et ROI) sont agrégées et injectées dans une **boucle de rétroaction automatique (AI Feedback Loop)** qui met à jour les règles éditoriales et l'affinité des personas de la Mémoire de Marque (`brand_profiles`).

---

## 2. Architecture & Composants

### 2.1 Modèle de Données (`packages/db/src/schema/marketing_analytics.ts`)
- **`content_performance_metrics`** :
  - Métriques d'engagement et financières par créneau ou publication (`impressions`, `views`, `clicks`, `likes`, `shares`, `comments`, `conversions`, `spend_cents`, `revenue_cents`).
  - Calcul automatique du taux d'engagement (`engagement_rate` %) et du retour sur investissement net (`roi_percent` %).
  - Indexation temporelle (`company_id`, `calendar_item_id`, `channel`, `recorded_at`).
- **`strategic_insights`** :
  - Recommandations tactiques générées par l'IA (`category`: `channel`, `persona`, `format`, `angle`).
  - Constat factuel (`observation`), action recommandée (`recommendation`), niveau d'impact (`high`, `medium`, `low`) et indice de confiance.
  - État de synchronisation avec la Brand Memory (`applied_to_brand_memory`).

### 2.2 Moteur Analytique & Boucle d'Apprentissage (`server/src/services/marketing-analytics.ts`)
- **Ingestion Batch & Calcul Sécurisé** : Enregistrement des performances par lot avec validation stricte Zod.
- **Synthèse Consolidée (`getAnalyticsOverview`)** : Calcul instantané des totaux de clics, conversions, taux d'engagement moyen, canal de surperformance et répartition granulaire.
- **Boucle de Rétroaction Autonome (`runBrandMemoryFeedbackLoop`)** :
  - Détection automatique des canaux dominants (ex: TikTok surperformant LinkedIn de 80%).
  - Mesure de rentabilité nette et d'efficacité des accroches.
  - Mise à jour atomique des règles éditoriales (`brand_profiles.editorial_rules`) pour orienter les générations futures de campagnes (Lot 2, Lot 3 et Lot 4).

### 2.3 Routes API Express (`server/src/routes/marketing-analytics.ts`)
- `POST /api/companies/:companyId/studio/analytics/metrics` : Ingestion de métriques en batch.
- `GET /api/companies/:companyId/studio/analytics/overview` : Vue analytique consolidée (filtrable par période : 7, 30, 90 jours).
- `POST /api/companies/:companyId/studio/analytics/feedback-loop` : Déclenchement de la boucle d'apprentissage IA.
- `GET /api/companies/:companyId/studio/analytics/insights` : Historique des recommandations générées.

### 2.4 Interface Utilisateur (`ui/src/components/MarketingAnalyticsPanel.tsx`)
- Cartes de KPIs en temps réel (Portée, Clics & Conversions, Taux d'Engagement Moyen, Rentabilité/ROI).
- Barre de progression visuelle de performance par canal.
- Bouton interactif `⚡ Activer Feedback Loop IA`.
- Grille des enseignements stratégiques avec badges `✓ Intégré dans Brand Memory`.

---

## 3. Matrice de Vérification

- **Tests unitaires (`server/src/__tests__/marketing-analytics.test.ts`)** : 3/3 tests passés (calculs ROI/taux, ranking canaux, injection Brand Memory).
- **Tests de routes et permissions (`server/src/__tests__/marketing-analytics-routes.test.ts`)** : 3/3 tests passés (isolation multitenant 403, validation Zod).
- **Suite globale vitest** : **293/293 tests passés** (70 fichiers de test) à 100%.
- **Typecheck global (`pnpm -r typecheck`)** : 0 erreur TypeScript sur les 13 packages.
- **Build monorepo (`pnpm -r build`)** : 100% réussi (UI Vite + Server).
- **Smoke Test E2E PostgreSQL (`scripts/verification/analytics-smoke.ts`)** :
  - Cycle analytique complet et rétroaction exécutés sur instance PostgreSQL 17 réelle (`soravyn_test`).
  - Preuve enregistrée dans `doc/verification/marketing-analytics.json`.
