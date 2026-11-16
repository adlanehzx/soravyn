# Connecteur Google Flow local — expérimental

Ce connecteur pilote l'interface web de Flow depuis un worker distinct, avec un profil Chromium dédié à chaque client. Il ne s'agit pas d'une API Google et aucun droit API n'est déduit de l'abonnement Ultra. Les conditions Google restent applicables : https://policies.google.com/terms . Aucun mécanisme de contournement de CAPTCHA, de restrictions d'accès ou d'authentification n'est inclus.

## État réel

Implémentés : file PostgreSQL, autorisation humaine de crédits par job, isolation des références client/campagne, suivi des étapes, téléchargement MP4 après vérification, commandes de connexion et de worker, écran dans Video Studio réservé aux administrateurs. Une interruption après armement du clic ne provoque jamais une seconde soumission automatique. Les jobs en attente peuvent être annulés ; une annulation locale n'annule pas une génération déjà soumise à Google.

Mise à jour : une génération Google réelle a ensuite été autorisée pour un maximum de 10 crédits et réalisée. Voir le bilan du test réel ci-dessous. La file initiale a été vérifiée sans dépense. La connexion manuelle et l'inspection authentifiée ont ensuite été réalisées ; les sélecteurs de l'adaptateur agent proviennent de cette inspection. Les tests locaux de la file prouvent la persistance et l'arrêt avant consommation ; le test réel Google est une preuve séparée. Les clips sont téléchargés dans le panneau Flow ; leur insertion dans la composition HyperFrames, les approbations et le portail client ne sont pas encore intégrées.

## Connexion et prérequis

L'API doit fonctionner pour le PostgreSQL embarqué. Installer Chromium et FFprobe, utiliser la même base et le même SORAVYN_VIDEO_ROOT pour l'API et le worker. Le worker est local, avec interface graphique par défaut. Ne pas exposer le profil ni son répertoire par HTTP. Aucun cookie, mot de passe ou token n'est copié dans la base ou les logs applicatifs.

```sh
pnpm flow:login --company UUID_DU_CLIENT
# Se connecter soi-même dans la fenêtre Chromium standard dédiée puis la fermer.
SORAVYN_FLOW_ENABLED=true pnpm flow:worker --company UUID_DU_CLIENT
```

Une seule commande connexion/worker peut posséder ce profil. Le verrou `browser.lock` reste en place après un crash brutal : arrêter tout processus propriétaire, contrôler les jobs et Flow avant de retirer manuellement ce répertoire. Ne pas supprimer le profil pour déverrouiller.

## Calibration opérateur

Créer un fichier privé `SORAVYN_VIDEO_ROOT/flow/UUID_DU_CLIENT/recipe.json` après inspection réelle du projet connecté. Pour le mode direct historique, ce fichier doit contenir les propriétés suivantes, validées strictement (le schéma agent est décrit plus bas) :

- `projectUrl` : URL HTTPS Google Flow sans paramètres ni credentials.
- `ready`, `prompt`, `submit`, `price`, `settings`, `download` : sélecteurs Playwright inspectés dans cette interface.
- `priceText` : texte exact du coût visible ; `credits` : son coût total vérifié pour un seul clip.
- `settingsText` : texte exact vérifié contenant le modèle, le format et le nombre de résultats attendus.
- `blockers` : sélecteurs réels des écrans de connexion, consentement ou challenge à surveiller.
- `reviewedAt` : date ISO de vérification, valide au plus sept jours.

Aucun exemple de sélecteur n'est fourni comme s'il était fiable. Utiliser un projet vide : si un téléchargement existe déjà, le job s'arrête pour éviter d'importer un ancien résultat. La création automatique de nouveaux projets et le traitement de plusieurs résultats restent à calibrer/développer ; ce connecteur ne garantit donc pas encore une chaîne de générations sans intervention.

Le texte du prix et des réglages doit correspondre exactement à la calibration. Le worker exige un seul résultat téléchargeable. Il ne lit pas le solde global du compte : l'enveloppe autorisée ne garantit pas le montant réellement facturé par Google ni un plafond entre plusieurs applications. Les nouvelles dépenses requièrent un nouveau job explicitement autorisé.

Le statut `submission_uncertain` exige une réconciliation humaine dans Flow. Il n'y a pas de bouton de relance automatique pour ce cas. Après reconnexion ou calibration, seuls les jobs arrêtés avant soumission peuvent reprendre.

## Vérifications

```sh
pnpm -r --workspace-concurrency=1 typecheck
pnpm test:run
pnpm build
SORAVYN_TEST_URL=http://127.0.0.1:3207 node scripts/verification/flow-smoke.mjs
```

Le smoke test crée deux clients de vérification et ne lance aucun navigateur Google. Son worker s'arrête sur l'absence de recette ; cette preuve est distincte d'une génération réelle. Voir `doc/verification/flow-connector.json`.

La commande de connexion lance Chromium normalement, sans Playwright ni CDP. Google peut néanmoins refuser ce navigateur ou une automatisation ultérieure. Aucun paramètre de camouflage ou contournement n’est ajouté. Si le refus persiste, arrêter cette voie et utiliser Flow manuellement ou une API officiellement prise en charge.

## Inspection authentifiée du 16 novembre 2026

La connexion manuelle a réussi. L'interface observée est Flow Agent : une proposition
conversationnelle annonce Veo 3.1 Lite, 8 secondes, 16:9, 720p et 10 crédits,
puis demande confirmation. Le réglage « Toujours » demander confirmation est activé.
Aucune génération vidéo Google n'a été déclenchée à ce stade.

Cette interface nécessite un parcours en plusieurs étapes (proposition, confirmation,
génération, téléchargement) qui n'est pas couvert par la recette directe historique. Un adaptateur dédié a été
ajouté ensuite (voir ci-dessous) ; le simple succès de connexion ne valide pas le
worker autonome. Le projet et les éléments d'inspection restent dans le
stockage privé local, hors dépôt.

## Test réel autorisé et adaptateur Flow Agent

Un seul clip a été approuvé dans Flow après autorisation explicite de l'utilisateur :
une vidéo Veo 3.1 Lite pour 10 crédits affichés. Le MP4 original 720p a été téléchargé
sans upscale : 1280 × 720, 7,93 secondes, H264/AAC, décodage FFmpeg complet réussi.
Le clip a été importé dans une campagne SORAVYN et son téléchargement HTTP vérifié.
Le montant effectivement débité n'a pas été réconcilié avec le relevé Google.
Preuve : `verification/flow-google-real.json`. Aucune deuxième génération n'a été lancée.

L'adaptateur `agent_confirmation` prend maintenant en charge le parcours observé :
création d'un projet vide, vérification du mode « Toujours » et du modèle par défaut,
saisie du brief, lecture de la permission native, refus de tout lot de plusieurs vidéos
ou prix supérieur au maximum, puis approbation ponctuelle et téléchargement original
720p. Il ne sélectionne jamais « Toujours approuver dans le projet ». Une recette locale
privée peut contenir `mode`, `projectUrl`, `model`, `reviewedAt`, `blockers` ; le modèle
calibré est strictement `Veo 3.1 - Lite`. Aucun appel à une API interne Google ni copie
de cookies n'est utilisé. La recette directe reste disponible pour les autres interfaces.

Les garde-fous de l'adaptateur ont passé des tests avec Chromium réel sur une page HTML
synthétique hors réseau. Ils sont distincts du test Google, exécuté par contrôle navigateur
puis import opérateur : **le worker automatique complet n'a pas encore effectué de
génération Google de bout en bout**. Son activation reste explicite et aucune génération
supplémentaire n'est autorisée par le test précédent.

Pour récupérer un résultat déjà généré sans répéter une dépense, l'opérateur local peut
utiliser `pnpm flow:import --company UUID --job UUID --file /chemin/clip.mp4 --observed-credits 10`.
Le job doit être arrêté, appartenir au client, disposer d'une autorisation suffisante et
le fichier doit passer FFprobe et un décodage complet FFmpeg. Cette commande importe
le résultat dans le stockage privé et le rend consultable dans le panneau Flow ; elle ne
constitue pas une validation éditoriale ni une publication.
