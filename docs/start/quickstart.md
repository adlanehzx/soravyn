---
title: Démarrage local
summary: Installer et utiliser SORAVYN depuis le dépôt
---

## Prérequis

Node.js 22 ou supérieur, pnpm, et Docker pour le worker vidéo. Le serveur peut utiliser PostgreSQL embarqué sans installation séparée.

Depuis la racine du dépôt SORAVYN :

```sh
pnpm install
pnpm dev
```

L’interface et l’API partagent http://localhost:3200. Ne pas exposer le mode local_trusted sur Internet.

## Préparer une production vidéo

```sh
pnpm video:image
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DATABASE pnpm video:worker
```

Le serveur et le worker doivent partager la même base et le même répertoire SORAVYN_VIDEO_ROOT. Utiliser les paramètres de votre installation, pas des identifiants de production copiés dans les exemples.

Dans le dashboard : créer un client, enregistrer sa marque, créer une campagne, puis ouvrir Video Studio. Saisir les scènes ou charger un brouillon généré par le modèle local configuré. Lancer le rendu, réviser et approuver avant livraison.

## CLI locale

```sh
pnpm soravyn --help
pnpm soravyn doctor
```

Aucun package public npm ni dépôt distant SORAVYN n’est supposé publié. Les commandes documentées s’exécutent depuis ce dépôt.

## Installation existante

Les nouvelles installations utilisent ~/.soravyn. Les anciennes configurations et données sont reconnues sans déplacement ni suppression. Les détails de compatibilité et les commandes vidéo se trouvent dans doc/IDENTITY_MIGRATION.md et doc/VIDEO_WORKER.md à la racine du dépôt.
