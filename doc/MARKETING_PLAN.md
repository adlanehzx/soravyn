# Plan Marketing Opérationnel & Validation de Gouvernance (Lot 3)

Le moteur de **Plan Marketing** de **SORAVYN** transforme un objectif commercial abstrait en un plan mensuel structuré, entièrement modifiable et obligatoirement soumis à une validation de gouvernance avant exécution.

Il s'appuie directement sur la **Mémoire de Marque (Lot 2)** (produits, personas, arguments et objections) pour générer automatiquement une progression stratégique sur 4 semaines, allouer les budgets et proposer des campagnes concrètes convertibles en un clic.

---

## 1. Modèle de Données & Isolation Multi-Tenant

Toutes les entités sont cloisonnées au niveau du client (`company_id`) avec cascades de suppression et contrôles stricts de frontière d'entreprise.

### Tables PostgreSQL (`@soravyn/db`)

1. **`marketing_plans`** : Plans marketing mensuels
   - `id` (UUID PK)
   - `company_id` (UUID FK -> `companies.id` ON DELETE CASCADE)
   - `title` (varchar 200, ex: *"Plan Marketing Novembre 2026 — Accélération Scale-Up"*)
   - `description` (text)
   - `period_month` (varchar 7, format `YYYY-MM`)
   - `commercial_goal` (varchar 1000, objectif chiffré cible)
   - `target_audience` (varchar 500)
   - `total_budget` (integer, budget global alloué)
   - `currency` (varchar 10, default `'EUR'`)
   - `priorities` (jsonb string[], axes stratégiques prioritaires)
   - `primary_channels` (jsonb string[], ex: `["LinkedIn", "YouTube", "TikTok"]`)
   - `status` (`draft` | `pending_validation` | `approved` | `rejected` | `archived`)
   - `approval_id` (UUID nullable FK -> `approvals.id`, traçabilité de gouvernance)
   - `rejection_reason` (text nullable)
   - `kpi_targets` (jsonb, KPIs cibles du mois)
   - `created_by_user_id` (varchar 255)
   - `created_at`, `updated_at`

2. **`marketing_plan_themes`** : Thèmes hebdomadaires
   - `id` (UUID PK)
   - `plan_id` (UUID FK -> `marketing_plans.id` ON DELETE CASCADE)
   - `company_id` (UUID FK -> `companies.id` ON DELETE CASCADE)
   - `week_number` (integer 1-52)
   - `title` (varchar 200, ex: *"Semaine 1 : Sensibilisation & Identification du Problème"*)
   - `description` (text)
   - `focus_persona_id` (UUID nullable FK -> `brand_personas.id`)
   - `focus_product_id` (UUID nullable FK -> `brand_products.id`)
   - `allocated_budget` (integer, part du budget total)
   - `target_kpi` (varchar 255, ex: *"50 000 impressions qualifiées"*)
   - `order_index` (integer)

3. **`marketing_plan_proposals`** : Propositions de campagnes concrètes
   - `id` (UUID PK)
   - `plan_id` (UUID FK -> `marketing_plans.id` ON DELETE CASCADE)
   - `theme_id` (UUID FK -> `marketing_plan_themes.id` ON DELETE CASCADE)
   - `company_id` (UUID FK -> `companies.id` ON DELETE CASCADE)
   - `title` (varchar 255)
   - `channel` (varchar 50)
   - `format` (varchar 50, ex: *"Video 16:9"*, *"Short 9:16"*, *"Post Carrousel"*)
   - `angle` (text, angle marketing stratégique)
   - `hook` (text, accroche pour capter l'attention)
   - `call_to_action` (text, action attendue de l'audience)
   - `estimated_cost` (integer)
   - `target_audience` (varchar 255)
   - `campaign_id` (UUID nullable FK -> `studio_campaigns.id`, lien vers la campagne créée)
   - `status` (`suggested` | `accepted` | `rejected` | `converted`)

---

## 2. Générateur Automatisé de Plan

Le service `generateMarketingPlan(db, companyId, input, userId)` :
1. Extrait le contexte complet de **Mémoire de Marque** du client (profil, offres avec tarification, profils personas, objections traitées).
2. Découpe le mois cible en 4 jalons stratégiques hebdomadaires :
   - **Semaine 1 — Sensibilisation** : Éducation sur les problèmes majeurs du persona cible, budget 25%.
   - **Semaine 2 — Démonstration de valeur** : Focus sur la proposition de valeur et fonctionnalités du produit, budget 30%.
   - **Semaine 3 — Preuves sociales & Objections** : Démystification des craintes via les réponses et preuves chiffrées, budget 25%.
   - **Semaine 4 — Conversion & Accélération** : Incitation à l'action avec offres et garanties, budget 20%.
3. Génère des propositions de campagnes ciblées associant canaux choisis (`LinkedIn`, `YouTube`, `TikTok`), formats vidéo et accroches basées sur les faits réels.
4. Équilibre rigoureusement l'enveloppe budgétaire : la somme des budgets hebdomadaires correspond exactement au budget total défini par l'opérateur.

---

## 3. Modifiabilité & Gouvernance Humaine

### Modification continue
Chaque plan, thème ou proposition peut être modifié, réorganisé ou complété manuellement via les endpoints REST et l'interface utilisateur :
- `PUT /api/companies/:companyId/studio/plans/:planId`
- `POST/PUT/DELETE /api/companies/:companyId/studio/plans/:planId/themes`
- `POST/PUT/DELETE /api/companies/:companyId/studio/plans/:planId/proposals`

### Portail de validation
Conformément aux principes de gouvernance SORAVYN :
1. Le plan est initialisé en statut `draft`.
2. L'opérateur soumet le plan à validation : `POST /api/companies/:companyId/studio/plans/:planId/submit-validation`.
3. Une demande d'approbation est créée dans la table `approvals` (`type: "marketing_plan_validation"`).
4. La direction ou l'opérateur habilité résout l'approbation : `POST /api/companies/:companyId/studio/plans/:planId/resolve-approval`.
   - Si `approved` : le statut passe à `approved`, débloquant le plan pour la conversion et l'exécution.
   - Si `rejected` : le statut passe à `rejected`, retournant le plan en révision avec motif consigné.

---

## 4. Conversion 1-Clic vers le Studio de Campagne

Chaque proposition approuvée peut être transformée directement en campagne opérationnelle :
- Appel : `POST /api/companies/:companyId/studio/plans/:planId/proposals/:proposalId/convert`
- Crée immédiatement un enregistrement dans `studio_campaigns` avec nom, objectifs, audience, canal et brief complet pré-rempli.
- Lie la proposition à la nouvelle campagne (`status: "converted"`, `campaignId: id`).
- Empêche toute double-conversion involontaire (`409 Conflict`).

---

## 5. Preuve de Validation & Tests

- **Tests unitaires de contrats et schémas** : `server/src/__tests__/marketing-plan.test.ts` (4 tests).
- **Tests d'isolation et sécurité de routes** : `server/src/__tests__/marketing-plan-routes.test.ts` (3 tests).
- **Suite globale vitest** : 63 fichiers de tests, 265 tests passés.
- **Smoke test de bout en bout** : `scripts/verification/marketing-plan-smoke.ts` validé avec succès sur PostgreSQL réel.
- **Preuve vérifiable** : `doc/verification/marketing-plan.json`.
