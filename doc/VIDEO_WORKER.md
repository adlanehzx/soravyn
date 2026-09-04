# Production vidéo locale

Le premier mode opérationnel compose un script de scènes explicite dans un template HTML/GSAP SORAVYN et lance HyperFrames 0.6.91. La génération de scripts via Ollama local est optionnelle et nécessite un modèle configuré. Narration eSpeak et images client sont intégrées ci-dessous. Musique, alignement des sous-titres au mot et publication automatique restent absents.

## Préparer et démarrer

```sh
pnpm video:image
pnpm dev
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DATABASE pnpm video:worker
```

Le worker doit utiliser la même base que le serveur. Avec la configuration embarquée héritée par défaut, la base écoute sur 54330 ; vérifier la configuration locale. Ne jamais copier les identifiants de développement dans un déploiement public.

Configurer SORAVYN_VIDEO_ROOT (chemin absolu recommandé), identique pour API et worker. Valeur par défaut : data/video à la racine du projet. SORAVYN_VIDEO_IMAGE permet de sélectionner une image administrée ; les utilisateurs ne peuvent pas fournir d'image ni de commande dans un brief.

Créer une marque et une campagne, puis ouvrir Video Studio. Ajouter les scènes et choisir le format. Le job est persisté ; démarrer le worker pour traiter la file. Le dashboard montre des événements observés, sans pourcentage artificiel. Les sorties réussies sont téléchargeables et une demande video_review est créée dans les approbations existantes.

## Architecture et limites

- Claim transactionnel PostgreSQL FOR UPDATE SKIP LOCKED ; lease de 20 minutes, timeout de rendu 15 minutes. Deux tentatives maximum après interruption ; échec explicite au-delà. Une relance manuelle d'un job échoué est possible.
- Worker séparé du serveur HTTP ; un job à la fois par processus.
- Conteneur non-root, réseau coupé, racine en lecture seule, capabilities supprimées, no-new-privileges, 2 CPU, 2 Go RAM, 256 processus, tmpfs et shm bornés. Aucun secret API ni socket Docker n'est monté dans le conteneur. Seul le dossier du job est partagé.
- Le worker administrateur accède au daemon Docker : il doit tourner sur un hôte de production dédié, pas exposer cette capacité aux agents.
- Le texte des scènes est échappé ; l'API n'accepte pas de HTML ni de commandes. Pas encore de compositions arbitraires générées par IA.
- Les fichiers sont privés et servis après vérification company. Le HTML est téléchargé avec CSP restrictive, jamais affiché directement dans l'origine authentifiée.
- Validation automatique MP4 : piste vidéo, dimensions et durée. La revue esthétique et éditoriale reste humaine. Aucun audit WCAG complet ni vision-agent automatique n'est revendiqué.
- Artefacts conservés : brief compatible avec le validateur upstream, storyboard, composition, MP4 et rapport FFprobe. Le script upstream validate-brief.mjs est réellement exécuté.
- Bibliothèque et révisions par scène sont disponibles avec les limites décrites ci-dessous. Les rendus échoués conservent leurs intermédiaires pour l'administration.
- Pas de preuve de vie du worker dans le diagnostic : une image disponible ne signifie pas qu'un worker tourne.

## Narration, images et révisions

Le formulaire accepte maintenant la narration locale `fr` ou `en` via eSpeak NG. Ce moteur n'est pas Kokoro : son rendu est synthétique. Réexécuter `pnpm video:image` pour installer la nouvelle image. Chaque piste de scène est mesurée, complétée par du silence jusqu'à la durée fixée, puis assemblée et muxée en AAC. Si une voix dépasse sa scène, le job échoue ; réduire le texte ou créer un projet avec une durée suffisante. Aucun débit accéléré silencieusement.

Les images PNG/JPEG/WebP sont envoyées via le stockage existant. L'API et le worker vérifient la company ; le worker contrôle aussi le SHA-256 et limite chaque fichier à 10 Mo. Décodage et normalisation PNG par Sharp dans le conteneur avec une limite de pixels. La note de licence/propriété saisie par l'opérateur est conservée dans assets.manifest.json ; cela ne certifie pas automatiquement ses droits. Les images occupent un emplacement distinct au-dessus du contenu, pour ne pas superposer leur texte éventuel au script. Pas encore de stock media automatique ni de génération d'images externe.

Les sous-titres exportés sont des SRT par scène, sans alignement au mot ni style dynamique. Les scènes affichent leur texte visuel dans la composition. Une révision change le titre et le texte visuel d'une scène, garde son horloge et son texte parlé, puis recalcule tout le rendu. L'ancien job reste intact, la révision porte revisionOf et revisionNote, et nécessite sa propre approbation. Le validateur upstream sert au brief HyperFrames sans audio ; la narration eSpeak est muxée dans une étape SORAVYN ultérieure et décrite dans le rapport final.

La Content Library centralise les productions terminées et images du client, recherche, créations approuvées, téléchargements et comparaison côte à côte de deux rendus. Limite actuelle : 100 productions et 100 images récentes ; pas de pagination ni comparaison synchronisée à l'image.

## Script IA local optionnel

Configurer SORAVYN_OLLAMA_URL et SORAVYN_OLLAMA_MODEL dans le serveur et le worker. Le bouton prépare un job asynchrone ; le worker appelle l'API locale Ollama et valide sa sortie JSON. Le script reste en état script_ready et doit être chargé/relu dans le formulaire avant rendu. Aucun rendu automatique ou appel payant n'en découle.

Référence du contrat utilisé : https://docs.ollama.com/api/generate (POST /api/generate, stream:false, format:json). Les endpoints cloud et arbitraires ne sont pas acceptés par ce connecteur local. Aucun modèle Ollama n'était disponible lors de l'implémentation : les tests du connecteur utilisent des réponses HTTP simulées. Une génération avec modèle réel reste à vérifier après installation/configuration par l'administrateur. Les autres adaptateurs agents existants restent utilisables indépendamment.

## Configuration unifiée du worker

`pnpm video:worker` lit désormais la même configuration d’instance que le serveur. DATABASE_URL reste prioritaire pour une base externe. En mode embarqué, démarrer l’API d’abord ; le worker détecte le port du cluster dans le fichier postmaster.pid et conserve son identité de base existante. Il n’est plus nécessaire de recopier des identifiants de développement dans la commande locale.
