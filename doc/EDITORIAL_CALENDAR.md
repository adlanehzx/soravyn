# Calendrier Éditorial & Distribution Multi-Canaux (Lot 4)

Le module de **Calendrier Éditorial** de **SORAVYN** assure la planification unifiée de tous les contenus marketing (vidéos, posts réseaux sociaux, newsletters/emails, articles de blog). Il s'intègre harmonieusement avec le **Générateur de Plan Marketing (Lot 3)** et les **Campagnes Studio** pour offrir une vue consolidée, chronologique et multi-canaux des diffusions programmées.

---

## 1. Modèle de Données & Isolation Multi-Tenant

Toutes les entités du calendrier éditorial respectent l'isolation stricte par client (`company_id`) avec cascades de suppression et contrôles d'accès serveur.

### Table PostgreSQL : `editorial_calendar_items` (`@soravyn/db`)

```sql
CREATE TABLE IF NOT EXISTS "editorial_calendar_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "plan_id" uuid REFERENCES "marketing_plans"("id") ON DELETE SET NULL,
  "proposal_id" uuid REFERENCES "marketing_plan_proposals"("id") ON DELETE SET NULL,
  "campaign_id" uuid REFERENCES "studio_campaigns"("id") ON DELETE SET NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "content_type" varchar(50) NOT NULL DEFAULT 'video',
  "channel" varchar(50) NOT NULL,
  "target_audience" varchar(255),
  "scheduled_at" timestamp with time zone NOT NULL,
  "status" varchar(50) NOT NULL DEFAULT 'draft',
  "asset_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_by_user_id" varchar(255),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

#### Typologies Supportées
- **`content_type`** : `video` | `social_post` | `email` | `article` | `ad`
- **`channel`** : `LinkedIn` | `YouTube` | `TikTok` | `Instagram` | `Twitter/X` | `Newsletter` | `Blog` | `Facebook`
- **`status`** : `draft` ➔ `scheduled` ➔ `in_production` ➔ `ready_for_review` ➔ `approved` ➔ `published` (ou `archived`)

---

## 2. Génération Automatique depuis le Plan Marketing

Le service `generateCalendarFromPlan` prend un plan marketing validé et projette automatiquement ses propositions de campagnes sur les 4 semaines du mois :

1. Détection du mois cible (`YYYY-MM`).
2. Calcul des créneaux horaires optimaux par canal :
   - **LinkedIn** : 09:00 UTC (pic d'engagement B2B)
   - **YouTube** : 16:00 UTC
   - **TikTok / Instagram** : 18:00 UTC
   - **Newsletter / Email** : 10:00 UTC
   - **Blog** : 11:00 UTC
3. Étalement régulier des diffusions selon le numéro de semaine (`week_number`).
4. Association automatique des `proposal_id` et conservation des métadonnées (hook, angle, CTA, budget estimé).

---

## 3. Architecture API & Sécurité

Toutes les routes sont préfixées par `/api/companies/:companyId/studio/calendar` et protégées par `assertCompanyAccess` :

| Méthode | Route | Description | Validation |
|---|---|---|---|
| `GET` | `/` | Liste filtrée des éléments (par statut, canal, type, période) | `editorialCalendarFilterSchema` |
| `GET` | `/stats` | Agrégation statistique temps réel (par statut, type, canal) | `periodMonth` query |
| `GET` | `/:itemId` | Détail d'un élément du calendrier | UUID item + company check |
| `POST` | `/` | Création manuelle d'une entrée de calendrier | `createEditorialCalendarItemSchema` |
| `PUT` | `/:itemId` | Mise à jour des informations, statuts ou URL d'assets | `updateEditorialCalendarItemSchema` |
| `DELETE` | `/:itemId` | Suppression d'un élément du calendrier | UUID item + company check |
| `POST` | `/generate-from-plan` | Génération en masse à partir d'un plan marketing | `generateCalendarFromPlanSchema` |

---

## 4. Interface Studio (`EditorialCalendarPanel.tsx`)

Le panneau React `EditorialCalendarPanel` est accessible directement depuis le Studio de Campagne via l'onglet **"Calendrier éditorial"** (`calendar`) :

- **Vue Grille Mensuelle** : Affichage jour par jour des contenus programmés avec pastilles de canal et badges de statut.
- **Vue Liste Chronologique** : Tri par date croissante avec détails (titre, canal, type de média, audience, campagne liée).
- **Statistiques en En-tête** : Compteurs temps réel par type de média (Vidéos, Posts, Emails, Articles) et par statut.
- **Générateur Intégré** : Bouton d'action pour synchroniser un plan marketing approuvé et injecter instantanément l'ensemble des contenus dans la grille.
- **Inspecteur de Contenu** : Modal permettant de modifier les dates de diffusion, mettre à jour le statut du cycle de vie et attacher les livrables finaux (URLs des rendus vidéo, carrousels, etc.).

---

## 5. Preuves de Vérification & Tests

### Tests Automatisés
- **Tests unitaires de service** : `server/src/__tests__/editorial-calendar.test.ts` (4/4 passés).
- **Tests d'intégration des routes** : `server/src/__tests__/editorial-calendar-routes.test.ts` (3/3 passés, vérifiant l'isolation multi-tenant stricte et la validation Zod).
- **Suite globale vitest** : 65 fichiers de test, 272 tests exécutés et validés.

### Test de Fumée E2E (`editorial-calendar-smoke.ts`)
Exécuté contre la base PostgreSQL intégrée en conditions réelles :
```bash
./server/node_modules/.bin/tsx scripts/verification/editorial-calendar-smoke.ts
```
Résultat documenté dans `doc/verification/editorial-calendar.json` :
- ✅ **Isolation stricte** : Tentative d'accès inter-entreprises rejetée avec succès.
- ✅ **Projection Plan ➔ Calendrier** : 8 propositions de campagnes transformées en créneaux sur 4 semaines.
- ✅ **Diversité Omnicanale** : 5 vidéos, 2 posts réseaux sociaux, 1 article et emails validés.
- ✅ **Cycle de vie complet** : Transitions `draft` ➔ `scheduled` ➔ `in_production` ➔ `ready_for_review` ➔ `approved` ➔ `published`.
- ✅ **Agrégation statistique** : Décompte temps réel exact.
