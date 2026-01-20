# Infrastructure & DevOps

## Structure du projet

```
habit-tracker/
├── Makefile                 # Commandes principales
├── docker-compose.yml       # Config de base (commune)
├── docker-compose.dev.yml   # Surcharges dev
├── docker-compose.prod.yml  # Surcharges prod
├── docker-compose.test.yml  # DB isolée pour tests
├── .env.dev                 # Variables dev
├── .env.prod                # Variables prod (⚠️ ne pas commit)
├── nginx/
│   └── conf.d/
│       └── default.conf     # Reverse proxy config
├── backend/
│   ├── Dockerfile           # Multi-stage (dev/prod)
│   └── src/
└── frontend/
    ├── Dockerfile           # Prod (nginx)
    ├── Dockerfile.dev       # Dev (vite)
    └── nginx.conf           # Config SPA
```

## Commandes rapides

```bash
make help       # Voir toutes les commandes
make dev        # Lancer en développement
make test       # Lancer les tests
make prod       # Déployer en production
make stop       # Tout arrêter
```

## Environnements

| Environnement | Commande    | Ports exposés                       |
| ------------- | ----------- | ----------------------------------- |
| Dev           | `make dev`  | API: 3000, Frontend: 5173, DB: 5432 |
| Prod          | `make prod` | HTTP: 80, HTTPS: 443                |
| Test          | `make test` | DB: 5433                            |

## Architecture Docker

```
┌─────────────────────────────────────────────────────┐
│                      nginx                          │
│                   (reverse proxy)                   │
│                    :80 / :443                       │
└──────────────┬─────────────────────┬────────────────┘
               │                     │
               ▼                     ▼
        ┌─────────────┐       ┌─────────────┐
        │   frontend  │       │     api     │
        │   (nginx)   │       │ (bun+hono)  │
        │     :80     │       │    :3000    │
        └─────────────┘       └──────┬──────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │     db      │
                              │ (postgres)  │
                              │    :5432    │
                              └─────────────┘
```

En **dev**, nginx est désactivé → accès direct aux services.

## Variables d'environnement

Copier `.env.example` vers `.env.dev` et `.env.prod` :

```bash
cp .env.example .env.dev
cp .env.example .env.prod
```

| Variable            | Description             | Requis |
| ------------------- | ----------------------- | ------ |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | ✅     |

## Premier lancement

```bash
# 1. Configurer les variables
cp .env.example .env.dev

# 2. Lancer en dev
make dev

# 3. Appliquer les migrations (dans un autre terminal)
make db-migrate
```

## Base de données

```bash
make db-migrate   # Appliquer les migrations
make db-studio    # Interface Drizzle (localhost:4983)
make db-backup    # Sauvegarder
make db-restore FILE=./backups/backup.sql  # Restaurer
make shell-db     # Accès psql direct
```

## Tests

```bash
make test         # Lance DB test → tests → cleanup
make test-watch   # Mode watch (DB reste active)
make test-db-down # Arrêter la DB de test manuellement
```

Les tests utilisent une DB PostgreSQL isolée sur le port 5433.

## Production

```bash
# 1. Configurer les variables prod
vim .env.prod  # Mettre un vrai mot de passe

# 2. Modifier nginx/conf.d/default.conf
# - Remplacer votredomaine.com par ton domaine
# - Décommenter la section HTTPS après obtention du certificat

# 3. Lancer
make prod

# 4. Générer le certificat SSL
make ssl-init  # Modifier le domaine dans le Makefile avant
```

## Logs & debug

```bash
make logs           # Tous les logs
make logs-api       # Logs API uniquement
make logs-frontend  # Logs frontend
make health         # État des conteneurs
make ps             # Liste des conteneurs
```
