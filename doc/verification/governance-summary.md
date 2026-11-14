# Vérification du socle de gouvernance

Contrôles exécutés le 14 novembre 2026 dans l'installation locale. Les preuves JSON décrivent les ressources de vérification et les résultats ; aucun credential de session n'y figure.

## Résultats

- Typecheck du monorepo exécuté avec concurrence limitée à un package : réussi.
- Suite complète : 243 tests, 58 fichiers, tous réussis. Les tests unitaires utilisent des fixtures ; ils ne constituent pas un appel à un fournisseur réel.
- Build complet : réussi, avec avertissements de taille de bundle et dépréciation Node `module.register()` conservés.
- Sessions HTTP BetterAuth : quatre comptes réellement créés ; rôles chef de projet, créatif, client et utilisateur extérieur exercés. Aucun nouveau compte ne reçoit le privilège global d'instance.
- Exécution Docker réelle : checkpoint conservé avant échec, reprise humaine réussie avec transmission par stdin, refus d'une reprise dupliquée ; masque d'un secret connu fragmenté et racine en lecture seule vérifiés.
- Deux commandes réellement demandées en concurrence : une admise, l'autre refusée avant lancement ; permis libérés.
- Une exécution générique ne contourne pas une réservation de campagne manquante. Un coût de fixture de 30 cents réduit une réservation de 80 à 50 disponibles, sans double comptage ; renouvellement et refus d'un dépassement vérifiés. Aucun fournisseur n'a facturé ces coûts de fixture.
- Modèle Ollama Qwen2.5 1.5B réellement exécuté : quatre étapes de pack terminées et trois textes produits, sans réponse simulée ni fournisseur payant.
- Nouveau MP4 de 6 secondes réellement produit par le worker final : téléchargement HTTP, H264, décodage complet FFmpeg et artefacts intermédiaires vérifiés. Ce contrôle précis est sans narration ; les preuves de narration et révision du lot précédent restent distinctes.
- Sauvegarde native restaurée dans une base temporaire distincte : données, 626 contraintes, 156 index et journal des migrations conservés. La base source n'a pas été remplacée.
- Chromium local : page Gouvernance vérifiée à 1280 et 390 px, sans débordement ni alerte. Le parcours complet et les formulaires de chaque rôle ne sont pas validés dans le navigateur : des timeouts du daemon ont interrompu la suite. Les contrôles d'autorisation HTTP ont bien été exécutés séparément.

## Limites restantes

L'archivage manuel est implémenté et typé, mais son déplacement réel de fichiers anciens n'a pas été exercé dans ce lot. Le quota vidéo est implémenté et un rendu réel a passé ; un stress test de plusieurs workers vidéo simultanés reste à réaliser. Aucune charge de production ni restauration complète des fichiers et de la clé maître n'a été simulée. Les alertes sont visibles dans l'administration, sans notification externe. Les contrôles éditoriaux sont indicatifs et ne prouvent pas les affirmations commerciales. Les agents hérités sans politique restent compatibles jusqu'à activation explicite du mode strict.

Aucune publication externe n'a été effectuée. Les commits de ce lot sont locaux, à leur date réelle ; aucun push n'a été effectué.
