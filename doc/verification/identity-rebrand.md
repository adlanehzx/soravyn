# Vérification du rebranding SORAVYN

Vérifications exécutées le 2026-11-13 dans cette installation locale.

- `pnpm install --no-frozen-lockfile` : réussi après renommage des packages workspace. Aucune publication npm/GitHub effectuée.
- `pnpm -r typecheck` : réussi sur tous les packages ; nouveau typecheck serveur réussi après unification de la configuration du worker.
- `pnpm test:run` : 50 fichiers, 199 tests réussis. Inclut variables héritées, préférences/brouillons navigateur, ancien JWT signé, paramètres gateway et navigation des pages Studio.
- `pnpm build` : réussi depuis des répertoires dist nettoyés ; nouveau build serveur réussi après la dernière modification du worker. Avertissement Vite : certains bundles dépassent 500 Ko. Dépréciation Node module.register héritée des outils TS.
- `pnpm soravyn --help` et `--version` : exécutés avec le nouveau nom.
- Les deux Compose sont syntaxiquement validés avec une valeur factice BETTER_AUTH_SECRET et `config --quiet` ; aucune stack Docker applicative n'a été déployée ou migrée par cette vérification.
- Redémarrage sur l'installation existante : les huit identifiants de workspaces sont identiques avant/après. Ancien stockage physique conservé, pas de déplacement de DB ni de clé de chiffrement.
- Instance neuve dans /tmp/soravyn-fresh-identity-instance : démarrage réel avec nouvelle identité, migrations et endpoint health réussis, zéro workspace. Instance de vérification arrêtée ensuite.
- `pnpm video:worker --once` : démarrage et accès à la base réussis sans DATABASE_URL recopiée. Pas de nouveau rendu déclenché par ce contrôle de démarrage.
- Le MP4, WAV, SRT et manifeste d'une vidéo révisée existante restent téléchargeables après rebranding. Le script video-revision-verify.mjs a réussi contre le serveur redémarré.
- Les clones upstream sont inchangés selon git status.

## Navigateur

Vérifications réelles avec le navigateur Preview : dashboard, Campaign Studio, Video Studio, Content Library et réglages. Titres SORAVYN, aucune ancienne marque dans le texte affiché des pages contrôlées. Navigation Studio corrigée pour conserver le préfixe client ; trois tests de régression ajoutés.

Contrôles à 1280 px et 390 px sur les pages Studio ; Campaign Studio, Video Studio, Content Library et réglages à 390 px sans débordement horizontal mesuré sur les vues visitées. Cela ne constitue pas une validation de tous les états, formulaires et appareils. Des rendus historiquement échoués restent visibles comme échecs dans les données de test ; ils ne sont pas masqués.

La capture Preview complète et deux lectures asynchrones ont expiré ; les lectures synchrones des titres, du DOM et des dimensions ont ensuite réussi. Aucun succès de capture d'écran n'est revendiqué.

## Références historiques conservées

Voir ../IDENTITY_MIGRATION.md : licences, code vendor, audit de provenance, compatibilité de configuration/données, fixtures de tests et export externe de l'icône lucide Paperclip. Les anciennes valeurs déjà enregistrées dans des historiques et configurations utilisateur ne sont pas réécrites arbitrairement.
