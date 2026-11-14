# Extensions du studio

## Lots livrés

1. **Pack créatif local** : jobs persistés, quatre étapes observables (stratégie, script, storyboard, textes), réponses structurées validées. Depuis Campaign Studio, les brouillons sont soumis aux étapes existantes dans leur ordre. La validation humaine reste obligatoire. Configurer `SORAVYN_OLLAMA_MODEL` et éventuellement `SORAVYN_OLLAMA_URL` sur l’API et le worker ; seul un endpoint local HTTP est accepté. Pas de nouvel appel cloud payant.
2. **Textes marketing** : rédaction, import des propositions du pack, validation/refus commenté et nouvelle version reliée à la précédente. Textes consultables et téléchargeables dans Content Library ; aucune publication externe.
3. **Brand Kit** : couleurs, langues, trois familles typographiques locales, règles éditoriales et logo PNG/JPEG/WebP avec mention des droits. L’API vérifie la propriété du logo et le worker vérifie son intégrité avant décodage isolé. Les workflows figent ces données ; modifier la marque ne réécrit pas les campagnes démarrées.
4. **Déclinaisons vidéo** : source approuvée, choix du format, sélection ordonnée des scènes et nouvelle accroche visuelle. Nouvelle production et nouvelle validation. Une déclinaison ne remplace pas la vidéo courante d’un workflow. Durée totale minimale de 5 secondes conformément au contrat du moteur ; maximum 90 secondes. Le rendu est complet, pas un calcul partiel de frames. Les timings personnalisés sont retirés lors d’une sélection de scènes.
5. **Commentaires timecodés et portail client** : position vérifiée dans la scène, tâche de correction facultative côté opérateur. Liens de revue limités à une vidéo, valables 1 à 14 jours, révocables ; jetons aléatoires stockés uniquement sous forme de hash. Le secret du lien reste dans le fragment navigateur et est transmis par en-tête masqué dans les logs. Le client ne voit ni les notes internes ni l’administration. Un lien permet une décision ; le refus crée une tâche sans exécuter de modèle. L’accord client est distinct de l’approbation interne. Une vidéo de workflow remplacée n’est plus accessible par son ancien lien.
6. **Budget et diagnostic** : enveloppe de campagne, montants réservés transactionnellement avant autorisation des tâches, coûts déclarés et libération manuelle après revue/fin de tâche. Diagnostic de base, stockage, modèle local, Docker, image de rendu et signal du worker récent.
7. **Voix et sous-titres** : préécoute WAV réelle avec eSpeak en conteneur isolé, débit/hauteur et remplacements littéraux de prononciation. Timings personnalisés, par mot ou phrase, contrôlés, exportés en SRT et affichés dans le rendu. Sans timings personnalisés, les sous-titres SRT suivent les scènes.

## Limites explicites

- Un modèle Ollama réel n’a pas été exécuté durant la vérification : le serveur HTTP de modèle est une fixture. Le chemin réel de génération dépend d’un modèle local installé, de ses capacités et des ressources disponibles.
- Pas de voix premium ni d’alignement automatique mot à mot. Les timings personnalisés sont saisis manuellement. Pas de musique ajoutée par ce lot.
- Le budget porte sur les autorisations du workflow. Il ne plafonne pas la facture d’un fournisseur et ne bloque pas les exécutions lancées hors de ce workflow. Coûts remontés et réservations s’additionnent jusqu’à libération manuelle : calcul volontairement conservateur, pas un relevé comptable.
- Le portail est un accès par possession d’un lien privé, pas un compte nominatif avec authentification forte. Il reste soumis à la configuration réseau de l’instance. Toute personne possédant le lien peut donner un avis ; révoquer le lien en cas de fuite.
- Le signal du worker repose sur un fichier du stockage partagé, actualisé toutes les dix secondes et considéré récent pendant trente secondes. C’est un diagnostic d’activité, pas une garantie de rendu ni un ordonnanceur distribué.
- La liste des packs est limitée aux 100 jobs récents de la campagne, celle des textes de bibliothèque à 200 éléments. Pas de pagination dans ce lot.
- Aucun test navigateur responsive n’a été exécuté pour ces nouveaux panneaux. TypeScript/build et tests HTTP ne remplacent pas une revue visuelle.

## Vérification reproductible

```sh
pnpm db:generate             # seulement après une modification du schéma
pnpm -r typecheck
pnpm test:run
pnpm build
```

Le script `scripts/verification/studio-extensions-smoke.mjs` attend une API locale démarrée ainsi, dans un terminal dédié :

```sh
PORT=3203 SORAVYN_OLLAMA_MODEL=soravyn-fixture \
SORAVYN_OLLAMA_URL=http://127.0.0.1:11435 pnpm dev:once
```

Puis exécuter dans un autre terminal :

```sh
node scripts/verification/studio-extensions-smoke.mjs
```

Le script démarre un serveur de modèle simulé sur le port 11435 et des workers `--once` limités à son client de vérification avec `SORAVYN_VIDEO_COMPANY_ID`. Éviter qu’un worker global traite simultanément ces jobs de test. Il crée des clients et artefacts de vérification ; il ne supprime aucune donnée existante. Docker, l’image `soravyn-video:0.6.91` et ffprobe sont nécessaires. Le résultat détaillé est écrit dans `/tmp/soravyn-extensions-proof.json`.

## Résultats exécutés dans cette installation

- Migration `0032_cooing_overlord.sql` générée avec Drizzle puis appliquée à la base locale.
- Typecheck complet réussi.
- 224 tests dans 55 fichiers réussis.
- Build complet réussi ; avertissement conservé sur la taille des bundles UI et dépréciation Node de `module.register()`.
- Le script HTTP d’intégration a réussi : logo normalisé dans le rendu réel, isolation client, pack de quatre générations simulées, textes versionnés, réservations budgétaires, validations, commentaires positionnés, portail restreint, refus client, décision unique, révocation, déclinaison 1920×1080 avec piste audio et préécoute WAV.
- La preuve machine est conservée dans [verification/studio-extensions.json](verification/studio-extensions.json). Aucun jeton de revue ou clé d’agent n’y figure.
- Les essais initiaux ont identifié un ancien worker qui récupérait les jobs de test et la contrainte moteur de durée minimale ; la vérification finale utilise un worker limité à son client et une durée conforme.
