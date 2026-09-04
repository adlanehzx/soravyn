# Workflow de campagne SORAVYN

## Parcours livré

Depuis Campaign Studio, ouvrir « Workflow de production et livrables », choisir les responsables stratégie, script et storyboard, puis créer le workflow. Les agents doivent appartenir au même client. La marque et le brief sont figés avec leur version/date dans le workflow ; une modification ultérieure de la marque ne change pas une production en cours.

La stratégie est la première étape ouverte. Les tâches script et storyboard restent bloquées jusqu'à l'approbation de leur prédécesseur. Les tâches sont créées sans assignee exécutable ; le responsable est enregistré dans l'étape. L'autorisation explicite de l'opérateur assigne la tâche, vérifie le budget mensuel restant de l'agent et demande son réveil via le mécanisme heartbeat existant. Si sa politique ou sa configuration empêche l'exécution, l'interface le signale. Un agent ne peut soumettre qu'une étape active dont il est responsable, après checkout de sa tâche. La production utilise les modèles/adaptateurs déjà configurés, pas un nouveau fournisseur implicite.

Un opérateur peut aussi rédiger le livrable manuellement ; son auteur est alors enregistré comme humain. Les tests du parcours utilisent cette possibilité et ne font pas passer leurs contenus de vérification pour une génération IA.

Chaque soumission crée un livrable immuable versionné et une nouvelle approbation. La stratégie utilise summary, positioning, keyMessages et channels ; script et storyboard utilisent le contrat de scènes du studio. Le centre de validation et le panneau de campagne exposent les contenus et décisions. Un refus ou une demande de révision exige un commentaire, annule la tâche de version précédente et crée une tâche de correction sans lancer de nouveau modèle payant. Une ancienne approbation ne peut pas valider une version plus récente.

Quand stratégie, script et storyboard sont approuvés, l'opérateur peut mettre le rendu en file. Le job reprend le snapshot de marque, le brief et le storyboard approuvé. Les rendus manuels indépendants sont refusés pour les campagnes gouvernées. Le worker reste séparé du serveur HTTP. Une sortie réussie passe la campagne en révision.

Un refus de vidéo crée automatiquement une tâche de correction. La nouvelle version conserve les scènes non modifiées, les durées et le texte parlé ; son job devient le livrable courant. L'approbation du correctif termine les tâches de correction de sa lignée. La livraison ne peut utiliser qu'une vidéo courante approuvée, jamais une version remplacée.

## Planning et rapport

Le planning enregistre canal et date pour une vidéo approuvée. Il ne publie rien sur les réseaux sociaux. L'opérateur confirme une livraison effectuée manuellement et peut ajouter un lien HTTP(S).

Les résultats sont saisis manuellement avec source, date et auteur. Ils sont présentés comme tels, sans intégration analytique ni ROI inventé. Le rapport JSON inclut les tâches, versions, décisions, vidéos, livraisons et mesures. Les coûts sont la somme des événements explicitement rattachés aux IDs des tâches de la campagne ; les consommations absentes ou non attribuées ne sont pas assimilées à un coût nul.

## API

Préfixe : /api/companies/:companyId/studio/campaigns/:campaignId/workflow

- GET / : contexte figé, étapes, livrables et corrections.
- POST / : strategistId, creativeId, producerId.
- POST /:kind/authorize : confirmConfiguredModelCosts:true (opérateur).
- POST /:kind/deliverables : content validé (opérateur ou agent responsable actif).
- POST /render : job vidéo issu du storyboard approuvé.
- GET/POST /schedule : planning manuel d'une vidéo approuvée.
- POST /schedule/:slotId/delivered : confirmation manuelle, externalUrl facultative.
- POST /schedule/:slotId/cancel : annulation d’un créneau non livré.
- POST /measurements : metric, value, target facultatif, unit, source, measuredAt.
- GET /report : export du rapport client traçable.

Les décisions utilisent les endpoints d'approbation existants. Les types campaign_deliverable et video_review sont réservés aux workflows et ne peuvent pas être forgés par l'endpoint générique de création d'approbations. L'accès client est vérifié avant les mutations d'approbation et la gestion des clés d'agents.

## Limites explicites

Le budget contrôlé est le budget mensuel de l'agent ; aucun plafond monétaire dur par campagne n'est revendiqué lorsque le coût de l'appel est inconnu. L'autorisation affiche cette limite avant exécution. Le rapport de coût dépend des remontées des fournisseurs. Les rôles humains conservent le modèle opérateur du socle ; une séparation fine administrateur/collaborateur/validateur demande une évolution supplémentaire.

Les étapes amont approuvées ne se rouvrent pas encore après lancement de la production. Pour modifier le brief ou les durées dans ce cas, créer une nouvelle campagne/production. Les révisions vidéo livrées concernent les visuels et gardent narration/horloge.

Une exécution créative complète avec un fournisseur LLM réel reste à vérifier avec un adaptateur configuré et une autorisation de coût. Les preuves de contrôle-plane, d'authentification agent, de rendu MP4, de concurrence, de refus et de livraison sont distinguées des réponses de modèles simulées ou des contenus saisis par l'opérateur de test.

## Annulation et suivi des coûts

Les jobs vidéo en file ou en cours peuvent être annulés depuis Video Studio. La décision est persistée avec invalidation du lease ; le worker surveille son lease, arrête son propre conteneur et ne peut pas publier un résultat sous un lease périmé. Les noms de conteneurs incluent le lease pour éviter qu'un ancien worker arrête le conteneur de son remplaçant. Une borne de durée interne au conteneur complète le timeout du processus worker. Une relance explicite est permise pour un échec ou une annulation.

Les coûts issus des exécutions heartbeat sont désormais rattachés à leur tâche lorsque le contexte fournit un issueId valide du même client. Ils passent par le service de coût existant, qui met à jour les budgets et met l'agent en pause après atteinte du budget mensuel déclaré. Les consommations n'exposant pas de coût ou de tâche restent signalées comme incomplètes dans le rapport ; cela ne garantit pas un plafond de facturation chez un fournisseur externe.

Les créneaux de livraison encore planifiés peuvent être annulés ; une livraison déjà enregistrée reste dans l'historique.
