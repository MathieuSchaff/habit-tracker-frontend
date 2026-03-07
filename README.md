# Habit Tracker — Infrastructure & Développement

# Guide de survie - Habit Tracker Monorepo

## 🚀 Démarrage du projet (première fois)

```bash
# 1. Cloner le repo et entrer dans le dossier
cd habit-tracker

# 2. Installer les dépendances
make install-deps

# 3. Build initial des types (OBLIGATOIRE avant Docker)
make ts-build

# 4. Synchroniser le schéma avec la DB (OBLIGATOIRE la 1ère fois)
# Cela crée les tables comme 'refresh_tokens' qui manquent sinon
#
make db-push

# 5. Vérifier que les types sont générés
make diagnose

# 6. Lancer l'environnement de développement
make dev
```

**Ou en une commande :**

```bash
make dev-fresh
```

---

## 🔄 Workflow de développement quotidien

### Terminal 1 - Types (toujours actif)

```bash
make ts-check
```

**Gardez ce terminal ouvert !** Il rebuild les types automatiquement quand vous modifiez du code.

### Terminal 2 - Docker

```bash
make dev
```

### Terminal 3 - Commandes diverses (optionnel)

---

## 🐛 J'ai un problème de types

### Symptôme : Erreur rouge dans l'éditeur ou `Cannot find module`

```bash
# 1. Vérifier l'état
make diagnose

# 2. Si les types sont manquants, les regénérer
make ts-build

# 3. Si ça ne suffit pas, nettoyer et rebuild
make ts-clean && make ts-build

# 4. Redémarrer Docker si nécessaire
make dev-down && make dev
```

### Symptôme : Les types ne se mettent pas à jour

```bash
# Vérifier que make ts-check tourne bien dans un terminal
# Puis forcer le rebuild complet
make ts-clean && make ts-build && make dev-down && make dev
```

---

## 📦 J'ajoute une dépendance

### Dans `shared/` (schéma Zod, types)

```bash
# 1. Modifier shared/package.json
# 2. Réinstaller
make clean-install

# 3. Rebuild les types
make ts-build

# 4. Rebuild Docker sans cache
make dev-rebuild
```

### Dans `backend/` (API Hono)

```bash
# 1. Modifier backend/package.json
# 2. Réinstaller et rebuild
make reinstall-backend
```

### Dans `frontend/` (React)

```bash
# 1. Modifier frontend/package.json
# 2. Réinstaller et rebuild
make reinstall-frontend
```

### Dans la racine (workspace)

```bash
# 1. Modifier package.json racine
# 2. Réinstallation complète
make clean-install && make ts-build && make dev-rebuild
```

---

## 🔥 Problèmes courants et solutions

### "Cannot find module '@habit-tracker/shared'"

```bash
# Les types ne sont pas générés
make ts-build
make diagnose  # Vérifier que shared/dist/index.d.ts existe
```

### "Hono RPC types not found" ou erreurs de type côté frontend

```bash
# Le backend n'a pas buildé ses types
make ts-clean && make ts-build && make dev-down && make dev
```

### Docker ne démarre pas / conteneurs en erreur

```bash
# Nettoyage doux
make clean-soft && make dev

# Ou nettoyage total si vraiment bloqué
make clean && make dev-fresh
```

### Hot reload ne fonctionne plus

```bash
# Rebuild sans cache
make dev-rebuild
```

### Problèmes de permissions (Windows/WSL)

```bash
# Nettoyage via Docker (évite les problèmes de permissions)
make clean-install
```

### Base de données corrompue / migrations en erreur

```bash
# Reset complet de la DB
make db-reset

# Ou nettoyage total + recréation
make clean-soft && make dev
```

---

## 📋 Commandes essentielles par situation

| Situation                               | Commande                                |
| --------------------------------------- | --------------------------------------- |
| **Premier démarrage**                   | `make dev-fresh`                        |
| **Démarrage rapide** (si déjà installé) | `make dev`                              |
| **Redémarrage après bug**               | `make dev-down && make dev`             |
| **Rebuild complet**                     | `make dev-rebuild`                      |
| **Voir les logs**                       | `make logs-api` ou `make logs-frontend` |
| **Entrer dans un conteneur**            | `make shell-api`                        |
| **Vérifier l'état**                     | `make diagnose`                         |

---

## 🎯 Makefile - Référence rapide

### Développement

| Commande                    | Description                                    |
| --------------------------- | ---------------------------------------------- |
| `make dev`                  | Lance Docker (nécessite `make ts-build` avant) |
| `make dev-d`                | Lance Docker en arrière-plan                   |
| `make dev-down`             | Arrête Docker                                  |
| `make dev-fresh`            | **Nuke + rebuild complet** (premier démarrage) |
| `make dev-rebuild`          | Rebuild sans cache                             |
| `make dev-rebuild-api`      | Rebuild uniquement l'API                       |
| `make dev-rebuild-frontend` | Rebuild uniquement le frontend                 |

### Types TypeScript (⚠️ **À LANCER DANS UN TERMINAL SÉPARÉ**)

| Commande        | Description                         |
| --------------- | ----------------------------------- |
| `make ts-check` | **Watch mode** - Gardez-le ouvert ! |
| `make ts-build` | Build unique des types              |
| `make ts-clean` | Supprime tous les dist/             |

### Installation / Dépendances

| Commande                  | Description                         |
| ------------------------- | ----------------------------------- |
| `make install-deps`       | Installe les dépendances            |
| `make reinstall-backend`  | Rebuild backend après ajout de dép  |
| `make reinstall-frontend` | Rebuild frontend après ajout de dép |
| `make clean-install`      | **Nuke node_modules + réinstall**   |

### Diagnostic / Debug

| Commande        | Description                        |
| --------------- | ---------------------------------- |
| `make diagnose` | Vérifie les types et l'état Docker |
| `make health`   | État des conteneurs                |
| `make ps`       | Liste des conteneurs               |

### Base de données

| Commande          | Description                                    |
| ----------------- | ---------------------------------------------- |
| `make db-studio`  | Interface Drizzle Studio                       |
| `make db-reset`   | **Reset complet** (vidage + migrations + seed) |
| `make db-clean`   | Vide la DB sans supprimer le container         |
| `make db-migrate` | Applique les migrations                        |
| `make db-backup`  | Backup la DB                                   |

### Tests

| Commande            | Description          |
| ------------------- | -------------------- |
| `make test`         | Lance les tests      |
| `make test-watch`   | Tests en mode watch  |
| `make test-db-up`   | Lance la DB de test  |
| `make test-db-down` | Arrête la DB de test |

### Nettoyage

| Commande            | Description                                    |
| ------------------- | ---------------------------------------------- |
| `make clean-soft`   | Arrête les conteneurs + nettoie les types      |
| `make clean`        | **NUKE TOTAL** (conteneurs + volumes + images) |
| `make clean-images` | Supprime les images pour forcer le rebuild     |

---

## 🏗️ Architecture des commandes

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  make ts-check  │────►│  make ts-build  │────►│    make dev     │
│   (terminal 1)  │     │  (si besoin)    │     │   (terminal 2)  │
│   Watch forever │     │  Build unique   │     │  Lance Docker   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                               │
         │                    ┌──────────────────────────┘
         │                    ▼
         │              ┌─────────────────┐
         └─────────────►│  Code modifié   │
                        │  Hot reload     │
                        └─────────────────┘
```

---

## ⚠️ Checklist avant de demander de l'aide

- [ ] `make ts-check` tourne dans un terminal ?
- [ ] `make diagnose` montre les types générés ?
- [ ] `make dev` est lancé ?
- [ ] Si nouvelle dépendance : `make clean-install` fait ?
- [ ] Si vraiment bloqué : `make clean && make dev-fresh` ?

---

## 💡 Astuce : Alias shell

Ajoutez dans votre `~/.bashrc` ou `~/.zshrc` :

```bash
alias ht='cd /chemin/vers/habit-tracker'
alias ht-dev='ht && make ts-check'  # Terminal 1
alias ht-docker='ht && make dev'     # Terminal 2
alias ht-fresh='ht && make dev-fresh' # Premier démarrage
alias ht-nuke='ht && make clean && make dev-fresh' # Nuke total
```

---

**Règle d'or** : Gardez toujours `make ts-check` ouvert dans un terminal !

## 🐳 Architecture Docker

```
┌─────────────────────────────────────────┐
│            nginx (reverse proxy)        │  (prod only)
│              :80 / :443                 │
└────────┬─────────────────────┬──────────┘
         │                     │
         ▼                     ▼
    ┌─────────┐           ┌────────┐
    │frontend │           │  api   │
    │(nginx)  │           │(bun+ho)│
    │:5173/80 │           │:3000   │
    └─────────┘           └───┬────┘
                              │
                              ▼
                         ┌─────────┐
                         │   db    │
                         │postgres │
                         │:5432    │
                         └─────────┘
```

**En dev** : nginx OFF → accès direct `localhost:3000` et `localhost:5173`
**En prod** : nginx ON → proxy vers services, HTTPS activé

---

## 📂 Structure du Projet

```
habit-tracker/
├── Makefile                      # Point d'entrée (make dev, make test, etc.)
├── .env.dev                      # Env dev (commité)
├── .env.prod                     # Env prod (⚠️ ne pas commiter)
│
├── docker-compose.yml            # Config de base
├── docker-compose.dev.yml        # Surcharge dev (ports exposés, volumes)
├── docker-compose.prod.yml       # Surcharge prod (nginx, SSL)
├── docker-compose.test.yml       # DB isolée test (port 5433)
│
├── nginx/
│   └── conf.d/default.conf       # Reverse proxy + SPA config
│
├── backend/
│   ├── Dockerfile                # Multi-stage (base → deps → dev/prod)
│   ├── drizzle.config.ts         # Config Drizzle ORM
│   ├── drizzle/                  # Migrations SQL générées
│   └── src/
│       ├── index.ts              # Point d'entrée Hono
│       ├── db/
│       │   ├── index.ts          # Connexion Drizzle
│       │   └── schema/           # Schémas des tables
│       └── routes/               # Routes API
│
├── frontend/
│   ├── Dockerfile                # Prod (build Vite → nginx)
│   ├── Dockerfile.dev            # Dev (serveur Vite + HMR)
│   ├── nginx.conf                # Config SPA
│   └── src/
│
└── shared/
    └── types/                    # Types partagés frontend/backend
```

---

## 🔌 Ports

| Service        | Dev  | Prod    | Notes              |
| -------------- | ---- | ------- | ------------------ |
| Frontend       | 5173 | 80/443  | Via nginx en prod  |
| API            | 3000 | Interne | Via nginx en prod  |
| DB             | 5432 | Interne | Exposée en dev     |
| DB Test        | 5433 | —       | Isolée pour tests  |
| Drizzle Studio | 4983 | —       | Interface visuelle |

---

## 🔐 Réseau Docker vs Local

### Dans les Containers

URL de connexion DB pour API :

```
DATABASE_URL=postgres://app:password@db:5432/appdb
```

`db` = hostname du service Docker (défini dans docker-compose)

### Hors Containers (outils locaux)

URL de connexion DB pour `drizzle-kit`, tests :

```
DATABASE_URL=postgres://app:password@localhost:5432/appdb
```

`localhost` = port exposé sur l'hôte (défini dans docker-compose)

### Où c'est défini ?

| Contexte                    | Fichier                            | URL               |
| --------------------------- | ---------------------------------- | ----------------- |
| Containers (API, frontend)  | `docker-compose.yml`               | `@db:5432`        |
| Outils locaux (drizzle-kit) | `Makefile` variable `DB_LOCAL`     | `@localhost:5432` |
| Tests                       | `Makefile` variable `DATABASE_URL` | `@localhost:5433` |

---

## 📦 Variables d'Environnement

### `.env.dev`

```bash
POSTGRES_PASSWORD=devpassword
```

✅ Safe à commiter (dev uniquement)

### `.env.prod`

```bash
POSTGRES_PASSWORD=un_mot_de_passe_securise_long_et_aleatoire
```

⚠️ **Ne jamais commiter** → mets dans `.gitignore`

**DATABASE_URL** : géré automatiquement par Docker Compose

---

## 🗄️ Drizzle ORM

### Configuration

`backend/drizzle.config.ts` utilise `process.env.DATABASE_URL` (**pas `Bun.env`**)

Pourquoi ? `drizzle-kit` tourne en Node.js même lancé avec Bun. Node ≠ Bun.

### Workflow

```bash
# 1. Modifier backend/src/db/schema/
# 2. Générer migration
make db-generate

# 3. Vérifier le SQL dans backend/drizzle/
# 4. Appliquer
make db-migrate
```

### Drizzle Studio

Interface visuelle pour explorer + modifier la DB en dev :

```bash
make db-studio
# → ouvre http://localhost:4983
```

---

## 💾 Backup & Restore

### Sauvegarder

```bash
make db-backup
# → ./backups/backup_20250125_143052.sql
```

Utilise `pg_dump` pour exporter (structure + données)

### Restaurer

```bash
make db-restore FILE=./backups/backup_20250125_143052.sql
```

Utilise `psql` pour importer

---

## 🧪 Tests

Tests unitaires + intégration du backend avec DB isolée.

```bash
# Une seule commande (setup + run + cleanup)
make test

# Ou mode watch (DB reste active)
make test-watch
make test-db-down  # Arrêter manuellement
```

DB test sur port 5433 (ne confond pas avec port 5432 dev)

---

## 🚨 Pièges Courants

| Problème                  | Cause                             | Solution                                      |
| ------------------------- | --------------------------------- | --------------------------------------------- |
| "Bun is not defined"      | `drizzle-kit` = Node, pas Bun     | Utiliser `process.env`, pas `Bun.env`         |
| "EAI_AGAIN db"            | URL avec `@db:5432` hors Docker   | Utiliser `@localhost:5432` pour outils locaux |
| DB non accessible         | Container pas démarré             | Faire `make dev` d'abord                      |
| Migrations pas appliquées | Oubli après `db-generate`         | Lancer `make db-migrate`                      |
| Frontend ne charge pas    | Nginx en dev (désactivé)          | Pas grave, aller sur `localhost:5173`         |
| Certificats SSL erreur    | Domaine pas modifié dans ssl-init | Modifier Makefile avant `make ssl-init`       |

---

## 📋 Production : Checklist

```bash
# 1. Configurer domaine et email
# Dans Makefile, modifier ssl-init pour votredomaine.com

# 2. Configurer variables prod
cp .env.example .env.prod
# → Éditer avec vrai password PostgreSQL

# 3. Configurer nginx
# Dans nginx/conf.d/default.conf, remplacer votredomaine.com

# 3.5 Appliquer les migrations
make prod-migrate

# 4. Lancer
make prod

# 5. Générer certificat SSL
make ssl-init

# 6. Vérifier
make health
```

---

## 🔍 Architecture Multi-Compose

Pourquoi 3 fichiers docker-compose ?

```bash
# Dev = base + overrides dev
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Prod = base + overrides prod
docker compose -f docker-compose.yml -f docker-compose.prod.yml up

# Test = fichier isolé
docker compose -f docker-compose.test.yml up
```

Permet de :

- Garder config commune (`docker-compose.yml`)
- Surcharger par environnement (ports, volumes, SSL)
- DB test isolée (pas de conflit)

---

## 📖 Ressources

- [Docker Compose docs](https://docs.docker.com/compose/)
- [Drizzle ORM docs](https://orm.drizzle.team/)
- [Hono docs](https://hono.dev/)
- [Vite docs](https://vitejs.dev/)

---

## 💬 Besoin d'aide ?

```bash
make help             # Affiche toutes les commandes
make logs             # Voir ce qui se passe
make health           # État services
```
