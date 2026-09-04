# Identité SORAVYN et compatibilité

La marque publique, les packages internes @soravyn/*, la CLI soravyn, les documents produit, les manifestes, le design des logos et les nouvelles configurations utilisent SORAVYN. Le dépôt n'est pas supposé publié sur GitHub ou npm ; aucune URL de publication n'est inventée.

## Installation existante

Les nouvelles installations utilisent ~/.soravyn. Si ce répertoire n'existe pas mais qu'un ancien répertoire d'instances existe, le serveur et la CLI l'utilisent sans déplacer ni supprimer les données. Les chemins explicites du fichier de configuration restent prioritaires. Pour changer de répertoire, sauvegarder puis déplacer l'ensemble de l'instance hors ligne, y compris sa clé de chiffrement ; utiliser SORAVYN_HOME pour sélectionner le nouvel emplacement.

Les variables SORAVYN_* sont canoniques. Les anciens préfixes OPENSOUL_* et PAPERCLIP_* sont reconnus par la couche de compatibilité ; une valeur canonique explicite gagne toujours, puis le préfixe OpenSoul précède Paperclip. Ne pas configurer des valeurs contradictoires. Le runner de développement conserve les variables transmises.

La base PostgreSQL embarquée existante garde ses identifiants physiques. Le serveur détecte les rôles/bases déjà installés ; les installations neuves utilisent soravyn. Aucune base vivante n'est renommée et aucun rôle historique n'est supprimé. Les secrets ne sont pas déchiffrés/réchiffrés pour un simple changement de marque.

Les anciens jetons agents correctement signés restent acceptés avec les paramètres d'émetteur/audience par défaut ; une configuration explicite d'émetteur/audience continue de les restreindre. Les anciens en-têtes de suivi, paramètres gateway et environnements de processus agents sont reconnus. Les nouveaux clients doivent utiliser les noms SORAVYN ; les imports de packages doivent migrer vers @soravyn/*. Les anciennes réponses d'API ne sont pas garanties identiques pour des consommateurs externes personnalisés.

## Préférences navigateur

Le script public legacy-storage.js copie une fois les préférences et brouillons des anciens espaces de noms vers soravyn dans localStorage/sessionStorage. Les valeurs canoniques existantes sont préservées et les anciennes valeurs ne sont jamais supprimées. Aucun contenu du stockage n'est journalisé. Les cookies d'authentification sont laissés au mécanisme existant.

## Docker

Les fichiers Compose et les nouvelles images utilisent SORAVYN. Pour un volume PostgreSQL déjà initialisé, conserver ses vrais identifiants avec SORAVYN_DB_USER, SORAVYN_DB_PASSWORD, SORAVYN_DB_NAME et DATABASE_URL. POSTGRES_* ne renomme pas les utilisateurs d'un volume existant.

Un ancien volume applicatif doit être sélectionné explicitement via SORAVYN_APP_VOLUME (nom Docker réel), sans créer un volume vide à sa place. Dans le Compose quickstart avec bind mount, SORAVYN_DATA_DIR doit pointer vers les données existantes. Sauvegarder et vérifier les montages avec docker compose config avant une mise à niveau ; retirer les anciens services après leur arrêt pour éviter deux serveurs/schedulers sur la même base. Le chemin interne du volume devient /soravyn ; vérifier les anciens chemins absolus du fichier de configuration et les adapter si nécessaire avant le redémarrage. Cette migration de déploiement Docker n'a pas été exécutée sur un volume utilisateur.

## Références qui restent intentionnellement

- LICENSE, THIRD_PARTY_NOTICES.md et les licences du code vendor : attributions obligatoires.
- vendor/llm-video-maker : composant tiers conservé avec son contrat original.
- ARCHITECTURE.md : audit de provenance des deux sources et leurs commits.
- legacy-compat, legacy-database-compat, legacy-api-compat et legacy-storage : compatibilité des données et installations.
- Les tests de compatibilité : anciens noms utilisés comme fixtures.
- Paperclip importé de lucide-react : nom externe de l'icône de pièce jointe, utilisé localement sous AttachmentIcon ; ce n'est pas une marque affichée.

Les clones upstream à côté de ce projet sont inchangés et ne constituent pas l'application distribuée.
