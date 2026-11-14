# Production persistante, compositions et narration

## Étapes et reprises

Les packs créatifs enregistrent séparément la stratégie, le script, le storyboard et les textes dans `production_steps`. Chaque ligne contient l’état, le nombre de tentatives, les dates, une empreinte des entrées et le résultat validé. Une sortie JSON invalide n’est jamais enregistrée comme un succès.

La relance d’un job échoué ou annulé conserve ses étapes réussies. Le worker les revalide et compare leurs empreintes avant réutilisation. Une reprise ciblée crée un nouveau pack : elle conserve les étapes compatibles situées avant l’étape choisie et recalcule celle-ci ainsi que les suivantes. La production source n’est pas modifiée et aucune approbation de campagne n’est accordée automatiquement.

Chaque tentative écrit dans un dossier propre à son lease. Les fichiers publiés sont copiés depuis cette tentative sous contrôle du lease, par renommage atomique. Un ancien conteneur ne partage donc pas les fichiers de travail de sa relance. Les tentatives et fichiers intermédiaires restent conservés ; aucune politique de purge automatique supplémentaire n’est ajoutée.

Les sauvegardes vérifient le lease du job dans une transaction. Un ancien worker ou un worker dont le job a été annulé ne peut pas publier tardivement son résultat. Une étape restée `running` après arrêt est présentée comme interrompue tant que le job n’est plus en cours. Les limites de récupération des leases et les deux tentatives automatiques existantes sont conservées ; les échecs explicites nécessitent une relance opérateur.

L’empreinte créative inclut le contexte figé, le modèle configuré, l’origine de l’endpoint et la version du pipeline. Elle ne détecte pas un changement des poids derrière un nom de modèle inchangé : utiliser un nouveau nom/version ou reprendre depuis la stratégie. Les sorties générées restent des propositions ; aucune vérification sémantique exhaustive des faits n’est prétendue.

## Rendu et artefacts

Le worker sépare deux opérations réelles en conteneurs restreints : préparation des médias et de l’audio, puis rendu et assemblage. Leurs fichiers sont décrits par des empreintes SHA-256. Une relance les réutilise uniquement si les fichiers attendus sont présents, de taille bornée et intègres. Une vérification MP4 échouée peut ainsi être relancée sans recalculer les images déjà rendues.

La composition HTML et les contrôles d’intégrité des médias source restent exécutés à chaque tentative. Ce mécanisme n’est pas un rendu incrémental frame par frame ; une modification visuelle crée toujours un nouveau rendu. Les anciens jobs sans étapes sauvegardées ne sont pas rétroactivement convertis.

## Trois compositions

- **Éditorial** : hiérarchie texte, repère de scène et média discret.
- **Produit** : visuel principal et argumentaire séparés, disposition adaptée au ratio.
- **Lancement** : accroche centrée, titre large et cadre de lancement.

Les compositions sont du code fixe SORAVYN. Titres, textes et noms de marque sont échappés ; aucun HTML ni script arbitraire n’est accepté par ce parcours. Le nom de composition fait partie du contrat validé. Les skills vendored et leurs notices restent inchangés.

## Aperçu de scène

Le bouton de prévisualisation crée un job distinct dans le worker. Il produit un vrai MP4, avec un grand côté de 640 pixels et 24 images/s, cadence conforme au contrat du moteur. Le format reste proportionnel ; une scène de moins de cinq secondes est prolongée à cinq secondes pour cet aperçu. Les sous-titres personnalisés sont recadrés sur la scène sélectionnée.

L’aperçu ne crée aucune approbation, ne remplace pas le storyboard approuvé et n’apparaît pas comme un livrable final. Il faut le relancer après une modification : ce n’est pas un éditeur vidéo en temps réel. Son téléchargement reste limité aux opérateurs autorisés de la company.

## Narration

La voix reste eSpeak, en français ou anglais. Le débit, la hauteur, les prononciations et les pauses entre mots sont configurables. La pause eSpeak est exprimée en unités de 10 ms à vitesse standard et varie avec le débit. Une option FFmpeg `loudnorm` vise −16 LUFS ; c’est une normalisation simple passe, pas une certification de diffusion audio. La préécoute applique également ces réglages.

Une révision ou déclinaison peut réutiliser la narration de sa source si elle appartient à la même company et campagne, si les textes parlés, durées, voix, prononciations, normalisation et image Docker exacte correspondent, et si le WAV correspond à l’empreinte de son rapport. Le rapport de la nouvelle vidéo indique la source réutilisée. Un fichier absent, altéré ou incompatible entraîne une nouvelle synthèse. Les anciens rapports sans empreinte audio ne sont pas utilisés comme cache.

Pas de voix neuronale/premium ni d’alignement automatique mot à mot dans ce lot. Les sous-titres personnalisés restent saisis manuellement. Aucun fournisseur payant ni poids de modèle supplémentaire n’est installé.

## Vérification

```sh
pnpm -r typecheck
pnpm test:run
pnpm build
```

Le script `scripts/verification/production-foundations-smoke.mjs` attend une API de test :

```sh
PORT=3204 SORAVYN_OLLAMA_MODEL=soravyn-foundation-fixture \
SORAVYN_OLLAMA_URL=http://127.0.0.1:11436 pnpm dev:once
```

Dans un second terminal :

```sh
node scripts/verification/production-foundations-smoke.mjs
```

Le script crée ses clients de test et emploie des workers limités à leur company. Éviter un worker global concurrent pendant ce contrôle. Le modèle HTTP est une fixture locale qui renvoie une fois un storyboard invalide. Le rendu, la narration, la normalisation et les mesures FFmpeg sont réels. Un faux binaire hôte `ffprobe` est utilisé pour provoquer volontairement un échec après rendu, puis le vrai binaire vérifie la reprise. Aucun fournisseur externe n’est appelé. La preuve machine est écrite dans `/tmp/soravyn-foundations-proof.json`.

Après le contrôle principal, `node scripts/verification/production-cancel-smoke.mjs` utilise sa preuve pour vérifier une annulation pendant une réponse du modèle, le refus d’une publication tardive puis la reprise de la seule étape interrompue. Ce contrôle emploie aussi une fixture HTTP.

Pour une mise à jour depuis l’ancien worker, arrêter les anciens processus avant de lancer la nouvelle version : les workers historiques utilisaient un dossier de travail commun par job. Les protections des nouvelles tentatives ne modifient pas le code d’un ancien processus encore actif.

## Résultats de cette installation

- Migration additive `0033_massive_jackpot.sql` générée puis appliquée à la base locale.
- Build complet réussi avec `pnpm -r --workspace-concurrency=1 build` ; avertissements conservés sur la taille des bundles UI et la dépréciation Node de `module.register()`.
- Typecheck complet et 231 tests dans 56 fichiers réussis. Le typecheck final a été relancé avec `--workspace-concurrency=1` après un premier processus tué par le système (code 137), qui n’est pas compté comme une réussite.
- Scénario HTTP complet réussi : échec structurel du storyboard, conservation des prédécesseurs, relance ciblée des textes et refus des accès inter-clients.
- Après échec volontaire de la vérification hôte, la reprise a réutilisé les médias, la narration et les images déjà rendues, avec leurs empreintes vérifiées. Les dossiers des deux tentatives sont distincts.
- MP4 source, révision et trois aperçus réels produits. Les aperçus ont été sondés avec ffprobe et leurs images extraites diffèrent ; les trois compositions ont été inspectées sur ces images. La normalisation a été mesurée avec FFmpeg et la narration de la révision est identique octet par octet à celle de sa source.
- Annulation pendant une réponse HTTP du modèle et reprise de la seule étape interrompue vérifiées. Aucune réponse tardive n’a publié un pack ni remplacé l’état annulé.
- Modèle de génération simulé, moteur vidéo/audio réel. Aucun test navigateur des nouveaux panneaux n’a été exécuté. Les permissions ont été vérifiées par HTTP, pas par une session navigateur multi-utilisateur.

La [preuve machine](verification/production-foundations.json) conserve les identifiants et résultats, sans jetons d’accès.
