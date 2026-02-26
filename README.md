# Habit Tracker — Infrastructure & Développement

## 🚀 Démarrage Rapide

```bash
# 1. Installer les dépendances
make install

# 2. Copier les variables d'environnement
cp .env.example .env.dev

# 3. Lancer le développement
make dev

# 4. Accéder aux services
# Frontend  → http://localhost:5173
# API       → http://localhost:3000
# DB Studio → make db-studio → http://localhost:4983
```

---

## 📋 Commandes Principales

### Développement

```bash
make dev              # Lancer (terminal) — logs en direct
make dev-d            # Lancer en arrière-plan
make dev-down         # Arrêter
make restart          # Redémarrer
```

### Tests

```bash
make test             # Lancer tests backend (setup DB + cleanup)
make test-watch       # Tests en mode watch (DB reste active)
make test-db-down     # Arrêter DB de test manuellement
```

### Production

```bash
make prod             # Lancer (nginx + SSL)
make prod-logs        # Logs production
make prod-down        # Arrêter
make prod-migrate
```

### Base de Données

```bash
make db-migrate       # Appliquer les migrations
make db-generate      # Générer les migrations depuis schema
make db-push          # Push schema (dev, sans migration)
make db-studio        # Interface visuelle (localhost:4983)
make db-backup        # Sauvegarder → ./backups/backup_YYYYMMDD_HHMMSS.sql
make db-restore FILE=./backups/backup_XXX.sql  # Restaurer
```

### Logs & Debug

```bash
make logs             # Tous les logs
make logs-api         # Logs API uniquement
make logs-db          # Logs PostgreSQL
make logs-nginx       # Logs Nginx
make logs-frontend    # Logs Frontend
make ps               # État des conteneurs
make health           # Santé des services
```

### Shell Interactif

```bash
make shell-api        # Shell dans container API
make shell-db         # psql direct
make shell-frontend   # Shell dans container frontend
```

### Maintenance

```bash
make clean            # ⚠️ Supprime tout (containers, volumes, images)
make clean-soft       # Supprime containers (garde volumes)
make stop             # Arrête tout
make build            # Build images prod
```

### SSL (Prod)

```bash
make ssl-init         # Générer certificats Let's Encrypt
make ssl-renew        # Renouveler certificats
```

---

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

| Service | Dev | Prod | Notes |
|---------|-----|------|-------|
| Frontend | 5173 | 80/443 | Via nginx en prod |
| API | 3000 | Interne | Via nginx en prod |
| DB | 5432 | Interne | Exposée en dev |
| DB Test | 5433 | — | Isolée pour tests |
| Drizzle Studio | 4983 | — | Interface visuelle |

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

| Contexte | Fichier | URL |
|----------|---------|-----|
| Containers (API, frontend) | `docker-compose.yml` | `@db:5432` |
| Outils locaux (drizzle-kit) | `Makefile` variable `DB_LOCAL` | `@localhost:5432` |
| Tests | `Makefile` variable `DATABASE_URL` | `@localhost:5433` |

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

| Problème | Cause | Solution |
|----------|-------|----------|
| "Bun is not defined" | `drizzle-kit` = Node, pas Bun | Utiliser `process.env`, pas `Bun.env` |
| "EAI_AGAIN db" | URL avec `@db:5432` hors Docker | Utiliser `@localhost:5432` pour outils locaux |
| DB non accessible | Container pas démarré | Faire `make dev` d'abord |
| Migrations pas appliquées | Oubli après `db-generate` | Lancer `make db-migrate` |
| Frontend ne charge pas | Nginx en dev (désactivé) | Pas grave, aller sur `localhost:5173` |
| Certificats SSL erreur | Domaine pas modifié dans ssl-init | Modifier Makefile avant `make ssl-init` |

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
