# SORAVYN — Lot 5 : Génération Storyboard IA Multimodal & Bridge Studio Vidéo

## 1. Vue d'Ensemble

Le **Lot 5** établit le pont autonome entre :
1. **La Mémoire de Marque (Lot 2)** : personas cibles, produits & propositions de valeur, objections traitées avec preuves vérifiables.
2. **Le Plan Marketing (Lot 3)** & **Le Calendrier Éditorial Omnicanal (Lot 4)** : propositions créatives, formats, accroches et dates de diffusion.
3. **Le Studio Vidéo Docker & HyperFrames (Lot 1)** : worker isolé, composition GSAP, synthèse vocale locale, rendu MP4 validé et extraction des sous-titres SRT.

---

## 2. Architecture & Composants

### 2.1 Synthèse de Storyboard Multimodal (`server/src/services/storyboard-generator.ts`)
- **Structure Narrative Calibrée** : 4 scènes consécutives totalisant 24 secondes :
  1. **Scène 1 : Hook (5s)** — Accroche percutante alignée sur l'audience cible et le canal.
  2. **Scène 2 : Problème / Friction (6s)** — Formulation de l'objection ou de la friction identifiée dans la Mémoire de Marque.
  3. **Scène 3 : Solution & Offre (8s)** — Démonstration de la proposition de valeur du produit de la marque.
  4. **Scène 4 : Appel à l'Action / CTA (5s)** — Clôture engageante vers la conversion.
- **Sous-titres Synchronisés (`captionCues`)** : Calcul des marqueurs temporels `[startMs, endMs]` pour la génération du fichier `.srt`.
- **Résolution Automatique de Plateforme** : `tiktok`, `reels`, `shorts` (9:16 vertical), `youtube` (16:9 paysage), ou `square` (1:1).

### 2.2 Endpoints API (`server/src/routes/video-storyboard.ts`)
- `POST /api/companies/:companyId/studio/video/preview-storyboard` : simulation et inspection du storyboard sans déclencher de rendu lourd.
- `POST /api/companies/:companyId/studio/video/generate-from-proposal` : génération du storyboard, mise en file d'attente du job vidéo (`studio_video_jobs`), et bascule du créneau éditorial en `status: "in_production"`.
- `GET /api/companies/:companyId/studio/video/proposals` : liste filtrée des propositions marketing éligibles au format vidéo.

### 2.3 Synchronisation Asynchrone & Post-Production
- **Rendu Terminé (`server/src/video-worker.ts`)** : Le worker notifie la fin du rendu et met à jour l'élément du calendrier éditorial lié en statut `ready_for_review` avec l'URL de téléchargement MP4 dans `publishedUrl`.
- **Gouvernance & Validation (`server/src/routes/approvals.ts`)** : Lorsque le décideur approuve la vidéo, le créneau du calendrier bascule automatiquement en `approved`.

### 2.4 Interface Utilisateur (`ui/src/components/EditorialCalendarPanel.tsx`)
- Détection automatique des éléments vidéo au calendrier.
- Bouton interactif `🎬 IA Storyboard & Rendu` ouvrant une modale de configuration (plateforme, template, narration).
- Prévisualisation instantanée du scénario des 4 scènes et des répliques voix off.
- Badge animé `⚙️ Rendu en cours...` pendant l'exécution du worker Docker.
- Lecteur vidéo HTML5 intégré avec boutons de téléchargement d'actifs MP4 une fois prêt.

---

## 3. Matrice de Vérification Réalisée

- **Tests unitaires (`server/src/__tests__/storyboard-generator.test.ts`)** : 9/9 tests validés.
- **Suite globale vitest** : **281/281 tests passés** à 100% sans aucun mock cassé.
- **Typecheck global (`pnpm -r typecheck`)** : 0 erreur sur l'ensemble des 13 packages.
- **Build monorepo (`pnpm -r build`)** : Bundle Vite UI & exécutable Node compilés avec succès.
- **Smoke Test E2E PostgreSQL (`scripts/verification/video-storyboard-smoke.ts`)** :
  - Cycle complet de bout en bout exécuté sur instance PostgreSQL réelle.
  - Vérification du respect strict du partitionnement multitenant (rejet 404 sur les requêtes cross-entreprises).
  - Preuve enregistrée dans `doc/verification/video-storyboard.json`.
