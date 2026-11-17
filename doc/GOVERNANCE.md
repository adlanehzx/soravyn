# Gouvernance et exploitation

## Contrôle des agents

La page Gouvernance est réservée aux administrateurs du workspace. La migration 0034 ajoute les politiques, permis d'exécution, points de reprise et règles d'exploitation. Les nouveaux comptes ne deviennent plus administrateurs d'instance : seul le premier compte peut amorcer ce rôle. Les administrateurs globaux existants sont conservés et doivent être révisés explicitement.

Une politique peut bloquer un agent, autoriser une commande `process` isolée, ou approuver un adaptateur de confiance. Le mode strict du workspace refuse les agents sans politique. Il est désactivé par défaut pour conserver les installations existantes ; les avertissements d'exploitation signalent les agents non couverts.

Le mode isolé lance Docker hors réseau, avec racine en lecture seule, dossier dédié au client et à l'agent, limites CPU/RAM/processus et délai maximal. Seules les variables explicitement approuvées sont transmises. Les commandes disponibles sont celles de l'image vidéo. Les adaptateurs natifs de confiance ne sont pas isolés du système hôte ; ils exigent une approbation explicite et un budget mensuel positif. Une politique exige par défaut une tâche identifiée. Une tâche de contexte doit être affectée à l'agent et ne pas être terminée.

Les capacités API sont contrôlées côté serveur pour les agents munis d'une politique. Les secrets connus sont masqués même lorsqu'ils traversent plusieurs fragments de journal. Ce filtre ne détecte pas toutes les transformations possibles d'un secret.

## Reprise humaine des tâches

Un agent peut enregistrer un checkpoint via `POST /api/issues/:id/checkpoints` pendant son exécution active, ou émettre une ligne `SORAVYN_CHECKPOINT:{"summary":"…","output":{"completed":[],"nextActions":[],"notes":"…"}}` dans sa sortie. Les champs sont bornés et validés ; ce contenu reste une donnée non fiable.

L'administrateur inspecte la tâche interrompue puis confirme les éventuels effets externes et les coûts avant de reprendre. La reprise conserve la trace de l'exécution source et transmet le dernier checkpoint. Elle refuse les doublons et ne reprend pas automatiquement une tâche terminée ou un agent suspendu. Elle ne garantit pas l'idempotence des outils externes : sans checkpoint, la vérification humaine des actions déjà réalisées reste nécessaire.

## Rôles et livrables

- Administrateur : configuration du workspace, politiques et membres.
- Chef de projet : campagnes, budgets, production et validation interne.
- Créatif : création et révision, sans validation interne ni administration.
- Client : textes et vidéos approuvés uniquement, via une vue dédiée.

Les contrôles s'appliquent au backend, aux fichiers et au canal temps réel. Un administrateur d'instance conserve un accès global distinct des rôles de workspace. Le mode `local_trusted` est un mode opérateur local et ne doit pas être exposé publiquement.

Le contrôle qualité déterministe signale les placeholders, répétitions, chiffres absents du contexte fourni et promesses absolues. Il n'invente pas de score et ne vérifie pas la vérité des affirmations. Une approbation comportant des erreurs de contenu inachevé nécessite une justification explicite.

## Budgets et concurrence

Les coûts déclarés et la part non consommée des réservations sont comptés une seule fois. Depuis une campagne, une autorisation peut être renouvelée : le montant saisi représente le nouveau disponible de la tâche, ajouté à ses dépenses déjà déclarées. Un dépassement de l'enveloppe est refusé. Les tâches d'agents rattachées à une campagne plafonnée exigent une réservation active, y compris depuis un réveil générique.

L'admission des agents utilise un verrou transactionnel partagé et des permis persistants ; les quotas globaux et par workspace s'appliquent à tous les processus. Les workers vidéo utilisent également une admission transactionnelle. Les valeurs globales par défaut sont 8 agents et 2 productions vidéo ; les limites de workspace sont configurables.

Les montants sont ceux déclarés à SORAVYN : une facture fournisseur peut arriver en retard ou dépasser une estimation pendant une exécution. Ces limites ne remplacent pas les plafonds du fournisseur et n'arrêtent pas une requête déjà facturée. Les coûts de vérification déclarés par les scripts sont explicitement des fixtures, sans appel payant.

## Exploitation, rétention et sauvegardes

La page affiche les échecs récents, politiques absentes ou de confiance, permis actifs et intermédiaires arrivés à échéance. L'archivage est manuel et réversible : les fichiers des jobs échoués, annulés, audio ou aperçus anciens sont déplacés vers `.retention/<companyId>/`. Les MP4 finaux sont exclus. Aucune purge définitive automatique ni notification externe n'est implémentée. La console de gouvernance et l'API (`GET /operations/archives`, `POST /operations/retention/:jobId/restore`) permettent de lister les archives réversibles et de restaurer leurs fichiers avec confirmation explicite, sous contrôle strict d'isolation de workspace.

Les sauvegardes SQL utilisent maintenant `pg_dump`, avec fichier temporaire privé et publication atomique. Installer un client PostgreSQL compatible avec la version du serveur ; `SORAVYN_PG_DUMP_PATH` permet de choisir le binaire. Le mot de passe est transmis par environnement, pas dans les arguments. La sauvegarde SQL ne contient pas les fichiers vidéo ni la clé de chiffrement : sauvegarder aussi le stockage et la clé maître séparément, avec contrôle d'accès.

Le test de restauration crée une base temporaire distincte, y restaure le dump, vérifie données, contraintes, index et journal des migrations puis supprime uniquement cette base. Il ne restaure jamais sur la base source.

## Vérifications reproductibles

Les scripts de gouvernance créent des workspaces, utilisateurs et tâches de test. Les lancer uniquement sur une installation de vérification ; ils ne suppriment pas ces fixtures. Les sessions et mots de passe générés restent dans `/tmp`, hors dépôt, en mode privé.

```sh
pnpm -r --workspace-concurrency=1 typecheck
pnpm test:run
pnpm build
# Deux API de test, locale sur 3206 et authentifiée sur 3205, sont requises :
node scripts/verification/governance-smoke.mjs
node scripts/verification/governance-concurrency-smoke.mjs
node scripts/verification/budget-reconciliation-smoke.mjs
```

Le contrôle du modèle local a utilisé `qwen2.5:1.5b` (Ollama, modèle externe Apache-2.0). Installer le modèle séparément, puis configurer `SORAVYN_OLLAMA_MODEL=qwen2.5:1.5b` dans l'API et le worker. Aucun abonnement grand public ne fournit implicitement une API. Le résultat vérifié est un pack de quatre étapes avec trois textes ; la qualité éditoriale reste à valider humainement. Voir les preuves dans `doc/verification/governance-*.json`.
