# Mémoire de Marque & Connaissances Vérifiables (Lot 2)

La mémoire de marque de **SORAVYN** constitue le socle de connaissances vérifiables ancrant chaque brief créatif, scénario, et campagne publicitaire générés par les agents autonomes.

Elle élimine les hallucinations, garantit la conformité avec la tarification et la promesse de vente réelle du client, et applique un moteur d'analyse déterministe signalant immédiatement les informations manquantes ou contradictoires.

---

## 1. Modèle de Données Déterministe

Toutes les entités sont cloisonnées au niveau du client (`company_id`), protégées par index unique et vérification de droits d'accès (`assertCompanyAccess`, `assertBoard`).

### Tables PostgreSQL (`@soravyn/db`)

1. **`brand_products`** : Offres et produits commercialisés
   - `id` (UUID PK)
   - `company_id` (UUID FK -> `companies.id` ON DELETE CASCADE)
   - `name` (varchar 200, requis)
   - `category` (varchar 100)
   - `description` (text)
   - `pricing` (varchar 100, requis pour valider un brief commercial)
   - `currency` (varchar 10, default `'EUR'`)
   - `value_proposition` (text, USP claire pour guider l'accroche)
   - `key_features` (jsonb string[], fonctionnalités différentiatrices)
   - `target_audience` (varchar 500)
   - `created_at`, `updated_at`

2. **`brand_personas`** : Profils clients cibles
   - `id` (UUID PK)
   - `company_id` (UUID FK -> `companies.id` ON DELETE CASCADE)
   - `name` (varchar 200, requis)
   - `role` (varchar 200, ex: *"Directrice Marketing"*)
   - `demographics` (text)
   - `pain_points` (jsonb string[], problèmes majeurs rencontrés)
   - `goals` (jsonb string[], objectifs prioritaires)
   - `objections` (jsonb string[], craintes ou freins typiques)
   - `preferred_channels` (jsonb string[], ex: `["LinkedIn", "YouTube"]`)

3. **`brand_objections`** : Objections fréquentes & contre-arguments vérifiables
   - `id` (UUID PK)
   - `company_id` (UUID FK -> `companies.id` ON DELETE CASCADE)
   - `product_id` (UUID nullable FK -> `brand_products.id` ON DELETE SET NULL)
   - `objection` (varchar 500, requis)
   - `category` (`pricing` | `product` | `trust` | `technical` | `timing` | `other`)
   - `recommended_response` (text, argumentaire de réponse recommandé)
   - `verifiable_proof` (text, preuve chiffrée, étude ou benchmark)

4. **`brand_sources`** : Documents officiels & sources de preuve
   - `id` (UUID PK)
   - `company_id` (UUID FK -> `companies.id` ON DELETE CASCADE)
   - `title` (varchar 300, requis)
   - `kind` (`document` | `faq` | `guideline` | `case_study` | `benchmark` | `proof`)
   - `content` (text, contenu vérifiable contenant les chiffres et faits)
   - `source_url` (varchar 1000)
   - `tags` (jsonb string[])
   - `verified` (`verified` | `draft` | `deprecated`)

---

## 2. Moteur de Gap Analysis & Préparation de Brief

Le service `server/src/services/brand-memory.ts` expose `evaluateAndPrepareBrief(context, input)` qui évalue tout brief marketing soumis (par un utilisateur ou par un agent autonome) et renvoie un diagnostic déterministe.

### Règles d'analyse et détections

| Code d'anomalie | Sévérité | Condition déclenchée | Action corrective |
|---|---|---|---|
| `unspecified_product` | `warning` | Aucun produit de la mémoire de marque n'est spécifié ou mentionné | L'agent ou l'utilisateur doit associer une offre |
| `missing_product_pricing` | `error` | Le produit ciblé n'a aucun prix ni modèle tarifaire | Bloquant : renseigner le tarif avant production |
| `missing_value_proposition` | `warning` | Le produit ciblé n'a aucune USP définie | Compléter la proposition de valeur pour ancrer l'accroche |
| `no_personas_defined` | `warning` | Aucun persona n'est enregistré dans l'espace client | Définir les cibles pour adapter le vocabulaire |
| `unspecified_persona` | `warning` | Des personas existent mais aucun n'est ciblé | Sélectionner ou mentionner un profil client |
| `channel_mismatch` | `warning` | Les canaux choisis ne figurent pas parmi les préférences du persona | Ajuster les canaux de diffusion |
| `unhandled_objections` | `warning` | Des objections fréquentes ne sont pas adressées | Insérer les contre-arguments recommandés |
| `unverified_claims` | `warning` | Des pourcentages ou chiffres clés dans le brief n'existent pas dans les sources vérifiées | Valider les chiffres ou ajouter la source documentaire |

### Statut de l'évaluation

- **`complete`** : Toutes les informations critiques sont présentes, aucune erreur, enrichissements générés.
- **`action_required`** : Recommandations ou avertissements non bloquants signalés.
- **`incomplete`** : Erreur bloquante (ex : produit sans tarif).

---

## 3. Points d'Accès API

Tous les endpoints sont montés sous `/api/companies/:companyId/studio/brand` :

- `GET /memory` : Récupère le contexte complet (profil, produits, personas, objections, sources, statistiques).
- `POST /prepare-brief` : Analyse et enrichit un brief marketing.
- `POST /products`, `PUT /products/:id`, `DELETE /products/:id` : CRUD produits.
- `POST /personas`, `PUT /personas/:id`, `DELETE /personas/:id` : CRUD personas.
- `POST /objections`, `PUT /objections/:id`, `DELETE /objections/:id` : CRUD objections.
- `POST /sources`, `PUT /sources/:id`, `DELETE /sources/:id` : CRUD sources documentaires.

---

## 4. Intégration Interface Utilisateur & Studio

Le composant `BrandMemoryPanel` (`ui/src/components/BrandMemoryPanel.tsx`) est directement intégré dans le Campaign Studio (`ui/src/pages/CampaignStudio.tsx`). Il offre 5 onglets interactifs :

1. **Produits & Tarifs** : Visualisation des offres avec badges de prix et formulaire d'ajout rapide.
2. **Personas Cibles** : Fiches personas avec rôles, pain points et canaux de prédilection.
3. **Objections & Réponses** : Cartographie des objections avec arguments et preuves chiffrées.
4. **Sources & Preuves** : Bibliothèque de documents vérifiés avec URL source et tags.
5. **Évaluateur de Brief & Gaps** : Outil interactif permettant de tester tout brief et d'obtenir en direct les alertes de manques et le brief enrichi.

---

## 5. Preuve de Vérification

La suite de tests unitaires et le script de vérification end-to-end `scripts/verification/brand-memory-smoke.ts` garantissent le respect intégral des critères de fin du Lot 2 :

- 258 tests unitaires au vert (`pnpm test:run`).
- Compilation complète TypeScript & Vite réussie (`@soravyn/shared`, `@soravyn/db`, `@soravyn/server`, `@soravyn/ui`).
- Preuve déterministe enregistrée dans `doc/verification/brand-memory.json`.
