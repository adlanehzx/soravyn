# Vérification du workflow de campagne

Date de fin : 2026-11-14. Serveur local à jour : port 3200, avec le worker vidéo séparé démarré.

## Exécuté avec données persistées et moteur réel

- Création d'une campagne, de son équipe et de ses trois tâches dépendantes.
- Refus d'un responsable d'un autre client ; refus d'accès d'un agent d'un autre client.
- Conservation du contexte de marque après modification de la marque principale.
- Soumission stratégique refusée puis corrigée en version 2, ancienne approbation bloquée.
- Approbation du script et du storyboard ; rendu uniquement depuis le storyboard approuvé.
- MP4 HyperFrames H.264/AAC de 8 secondes, voix française locale eSpeak.
- Refus de la vidéo créant une tâche de correction ; révision devenue version courante.
- Piste WAV identique entre source et révision ; validation du correctif terminant la tâche de correction.
- Planning réservé aux vidéos approuvées, refus des doublons, livraison manuelle, annulation de créneau et conservation dans le rapport.
- Résultat manuel sourcé et daté ; valeurs de vérification clairement identifiées comme fixtures sans performance marketing revendiquée.
- Soumissions et décisions concurrentes : une seule version et une seule avance d'étape.
- Vraie clé d'agent, autorisation, réveil d'un adaptateur process, checkout atomique et soumission authentifiée. L'adaptateur de test exécute /usr/bin/true ; son contenu créatif est une fixture, pas un résultat LLM.
- Événement de coût synthétique rattaché à une tâche : pause au budget mensuel, nouvelle autorisation refusée, référence de coût inter-client refusée. Aucun fournisseur n'a été facturé par ce test.
- Annulation d'un vrai conteneur de rendu en cours, conservation de l'état annulé et absence de conteneur restant.

Résultats machine : campaign-workflow.json, campaign-agent-submission.json, campaign-concurrency.json, campaign-budget.json, campaign-schedule-cancel.json, video-cancellation.json.

## Contrôles de code et interface

Typecheck complet et build de tous les packages réussis. Suite de tests : 209 tests dans 53 fichiers réussis avec deux workers. Le script pnpm test:run fixe désormais cette limite pour rendre la vérification plus prévisible dans cet environnement. Une exécution parallèle antérieure arrêtée avec code 1 sans bilan n'est pas considérée comme une réussite.

Contrôle navigateur du panneau de campagne et du rapport : étapes, versions, décisions, correction terminée, planning et mesure sourcée affichés. Aucun message d'erreur dans le panneau contrôlé. Largeurs 1280 et 390 px : pas de débordement horizontal constaté sur ce scénario. Ce contrôle ne remplace pas un parcours complet de chaque formulaire et de chaque appareil.

Les frontières des décisions d'approbation et des opérations sur les clés d'agents ont aussi des tests HTTP avec contexte de membre injecté. Ces tests ne sont pas une preuve de connexion multi-utilisateur avec de vraies sessions Better Auth. La séparation fine administrateur/collaborateur/validateur reste à développer.

## Limites

Aucune génération créative de bout en bout avec un LLM réel n'a été exécutée faute de fournisseur/modèle configuré et autorisé. Aucun achat, aucune publication sociale et aucun déploiement public. Les coûts non remontés restent inconnus ; le budget est celui des agents, sans plafond monétaire dur par campagne garanti. Les anciennes étapes approuvées ne sont pas encore réouvertes pour modifier le brief après production.

Voir ../CAMPAIGN_WORKFLOW.md pour les commandes, contrats et comportements.
