# Synthèse de vérification — Lot 1 : Fiabilisation de l'Alpha SORAVYN

Date : 17 novembre 2026

Le lot 1 consolide les fondations opérationnelles de SORAVYN pour une exploitation alpha robuste, avec des preuves de tests reproductibles.

## 1. Archivage et Restauration Réversible des Artéfacts

- **Endpoint d'archivage** : `POST /api/companies/:companyId/governance/operations/retention/archive`
- **Liste des archives disponibles** : `GET /api/companies/:companyId/governance/operations/archives`
- **Restauration unitaire** : `POST /api/companies/:companyId/governance/operations/retention/:jobId/restore`
- **Garanties vérifiées** :
  - Seuls les jobs non terminaux ou échoués/annulés anciens sont archivables.
  - Les rendus finaux approuvés et les artéfacts récents sont protégés et ne sont jamais déplacés.
  - L'archivage est déplacé dans `.retention/<companyId>/`.
  - La restauration replace les artéfacts dans le répertoire d'origine de l'entreprise et met à jour l'état du job.
  - Isolation multi-client vérifiée : une entreprise B ne peut ni lister ni restaurer les archives d'une entreprise A (retour 404 / 409).
  - Écran d'administration mis à jour dans `Governance.tsx` avec déclenchement et suivi de la restauration.
- **Rapport de preuve** : `doc/verification/alpha-retention.json`

## 2. Concurrence des Workers Vidéo et Quotas

- **Test avec 4 processus workers indépendants** sous admission transactionnelle.
- **Garanties observées** :
  - Plafond global d'un rendu respecté (`SORAVYN_MAX_VIDEO_RUNS=1` -> max 1 job actif simultanément).
  - Plafond par workspace client (1 rendu maximum par entreprise).
  - Conservation durable des files d'attente (les jobs en attente restent `queued` puis s'exécutent dès libération).
  - Décodage complet des flux vidéo MP4 via `ffprobe` et `ffmpeg` (codec H.264, durée exacte, aucun fichier corrompu).
- **Rapport de preuve** : `doc/verification/alpha-video-concurrency.json`

## 3. Restauration après Sinistre (Disaster Recovery)

- **Test de reprise complète sur base isolée temporaire** :
  - Dump SQL natif via `pg_dump` avec fichier temporaire restreint (0600) et intégrité transactionnelle.
  - Restauration du dump dans une nouvelle base PostgreSQL créée dynamiquement.
  - Sauvegarde et restauration des fichiers média vidéo et assets locaux (301 fichiers vérifiés, 28,5 Mo).
  - Vérification de chaque hash SHA256 des fichiers restaurés.
  - Restauration de la clé maîtresse de chiffrement (`master.key`) et déchiffrement réussi des secrets sur la base restaurée.
  - Journal des migrations Drizzle conservé et intègre.
  - Aucune information d'identification ni mot de passe divulgué dans les logs ou dépôts.
- **Rapport de preuve** : `doc/verification/alpha-disaster-restore.json`

## 4. Parcours Utilisateur et Responsive (Desktop & Mobile)

- Contrôles effectués sur navigateurs aux résolutions :
  - **Desktop** : 1280 × 844 px
  - **Mobile** : 390 × 844 px (émulation iPhone)
- Pages testées :
  - `/governance` (Gouvernance)
  - `/campaigns` (Campaign Studio)
  - `/video` (Video Studio)
  - `/library` (Content Library)
- **Résultats** :
  - `scrollWidth == width` sur toutes les pages en 1280px et 390px (aucun débordement horizontal).
  - Titres et composants chargés sans alerte ni erreur.
- **Rapport de preuve** : `doc/verification/alpha-browser-navigation.json`
