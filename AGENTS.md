# Contribution à SORAVYN

Lire `README.md`, `doc/README.md`, `doc/SPEC-implementation.md` et les guides concernés avant une modification.

- Garder les données et les permissions isolées par company côté serveur.
- Synchroniser schémas, migrations, contrats partagés, API et interface.
- Préserver le checkout atomique des tâches, les validations humaines, les budgets et le journal d’audit.
- Exécuter les rendus dans le worker isolé, jamais dans le processus HTTP.
- Ne pas exposer de secrets ni présenter des résultats simulés comme réels.
- Préserver les licences et notices de tiers.
- Générer les migrations avec `pnpm db:generate` ; ne pas réécrire les migrations appliquées.

Avant livraison : `pnpm -r typecheck`, `pnpm test:run`, `pnpm build`. Rapporter les contrôles réellement exécutés et leurs limites.
