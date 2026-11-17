# SORAVYN — Lot 6 : Connecteurs de Publication & Distribution Omnicanale

## 1. Vue d'Ensemble

Le **Lot 6** implémente le moteur de diffusion autonome et sécurisé de SORAVYN Studio. Il connecte les créneaux validés du calendrier éditorial (`editorial_calendar_items`) aux canaux de distribution externes (LinkedIn, YouTube, TikTok, X, CMS, Webhooks d'automatisation Zapier/Make).

---

## 2. Architecture & Composants

### 2.1 Modèle de Données (`packages/db/src/schema/distribution.ts`)
- **`distribution_channels`** : Enregistre les connecteurs omnicanaux configurés par entreprise (`channel_type`: `linkedin`, `youtube`, `tiktok`, `x`, `webhook`, `cms`), avec état (`active`, `paused`, `error`), endpoints, headers HTTP et configurations d'authentification chiffrées/protégées.
- **`distribution_logs`** : Audit trail immuable de chaque diffusion (payload envoyé, réponse de l'API distante, code HTTP, identifiant externe `external_post_id`, URL finale de consultation `external_post_url` et horodatage `dispatched_at`).

### 2.2 Verrou de Sécurité & Gouvernance (`server/src/services/distribution.ts`)
- **Contrôle Pré-Publication Strict** : Le moteur refuse catégoriquement de publier un contenu si son statut n'est pas `approved` (ou `ready_for_review` / `scheduled`). Tout contenu `draft` ou non validé par un décideur lève une exception 400.
- **Signature HMAC SHA-256** : Pour les webhooks et intégrations sécurisées, signature dynamique du payload injectée dans l'en-tête `X-Soravyn-Signature`.
- **Adaptateurs d'URLs Externes** : Construction et résolution automatique des permaliens distants selon le canal (`linkedin.com/feed/update/...`, `youtube.com/watch?v=...`, `tiktok.com/@brand/video/...`, `x.com/brand/status/...`).

### 2.3 Routes API Express (`server/src/routes/distribution.ts`)
- `GET /api/companies/:companyId/distribution/channels` : Liste des canaux configurés pour l'entreprise.
- `POST /api/companies/:companyId/distribution/channels` : Configuration d'un nouveau canal de diffusion.
- `PATCH /api/companies/:companyId/distribution/channels/:channelId` : Modification des paramètres ou désactivation.
- `DELETE /api/companies/:companyId/distribution/channels/:channelId` : Suppression d'un connecteur.
- `POST /api/companies/:companyId/distribution/channels/:channelId/test` : Test de connectivité et mesure de latence en direct.
- `POST /api/companies/:companyId/distribution/calendar/:itemId/publish` : Déclenchement de la publication en 1 clic.
- `GET /api/companies/:companyId/distribution/logs` : Consultation des logs d'audit de diffusion.

### 2.4 Interface Utilisateur (`ui/src/components/EditorialCalendarPanel.tsx`)
- **Bouton d'Action `🚀 Publier`** : Visible sur les contenus validés (`status === 'approved'`), avec indicateur de progression en temps réel (`⏳ Dispatch...`).
- **Lien Externe `🔗 En ligne`** : Accessible instantanément dès qu'un contenu passe au statut `published` avec son URL distante.

---

## 3. Matrice de Vérification Réalisée

- **Tests unitaires (`server/src/__tests__/distribution.test.ts`)** : 3/3 tests validés (verrou de gouvernance, dispatch unitaire, mapping d'URLs).
- **Tests de routes et permissions (`server/src/__tests__/distribution-routes.test.ts`)** : 3/3 tests validés (isolation multitenant 403, validation Zod).
- **Suite globale vitest** : **287/287 tests passés** (68 fichiers de test) à 100%.
- **Typecheck global (`pnpm -r typecheck`)** : 0 erreur TypeScript sur les 13 packages.
- **Build monorepo (`pnpm -r build`)** : 100% réussi (UI Vite + Server).
- **Smoke Test E2E PostgreSQL (`scripts/verification/distribution-smoke.ts`)** :
  - Cycle complet de distribution exécuté sur instance PostgreSQL 17 réelle (`soravyn_test`).
  - Blocage vérifié sur les contenus `draft` (violation de gouvernance).
  - Validation du basculement en `published`, inscription du log d'audit et étanchéité cross-entreprises.
  - Preuve enregistrée dans `doc/verification/distribution.json`.
