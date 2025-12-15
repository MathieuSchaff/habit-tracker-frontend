# 🎯 Habit Tracker Backend

Stack Bun + PostgreSQL + Nginx + Certbot avec Docker Compose.

## 📚 Documentation

- **[README.dev.md](./README.dev.md)** - Développement local
- **[README.prod.md](./README.prod.md)** - Déploiement production

## 🏗️ Stack

| Composant       | Technologie             |
| --------------- | ----------------------- |
| Runtime         | Bun 1.x                 |
| Framework       | Hono 4.x                |
| Base de données | PostgreSQL 16           |
| ORM             | Drizzle ORM 0.45        |
| Reverse Proxy   | Nginx 1.27              |
| SSL/TLS         | Certbot (Let's Encrypt) |

## 🚀 Démarrage rapide

### Mode développement

```bash
# Installation
bun install

# Copier l'exemple
cp .env.example .env

# Démarrer la DB
bun run docker:dev:db

# Lancer l'API (hot reload)
bun run dev
```

👉 Voir [README.dev.md](./README.dev.md)

### Mode production

```bash
# Créer .env.prod
echo "POSTGRES_PASSWORD=votre_password_fort" > .env.prod

# Démarrer tout
bun run docker:prod

# Générer SSL
docker compose exec certbot certbot certonly --webroot -w /var/www/certbot -d votredomaine.com --email votre@email.com --agree-tos
```

👉 Voir [README.prod.md](./README.prod.md)

## 📦 Structure

```
.
├── src/                      # Code source
├── nginx/conf.d/             # Config Nginx
├── docker-compose.yml        # Config de base
├── docker-compose.dev.yml    # Surcharges dev
├── docker-compose.prod.yml   # Surcharges prod
├── Dockerfile                # Multi-stage (dev + prod)
├── .env.dev                  # Variables dev
├── .env.prod                 # Variables prod (non commité)
└── .env.example              # Template
```

## 🔐 Architecture

```
Internet
   ↓
[80/443] Nginx
   ↓
[3000] API Bun (réseau Docker interne)
   ↓
[5432] PostgreSQL (réseau Docker interne)
```

Seul Nginx est exposé publiquement.

## 📝 Variables d'environnement

### `.env.dev` (développement)

```env
POSTGRES_PASSWORD=dev_password_123
```

### `.env.prod` (production)

```env
POSTGRES_PASSWORD=VotreMotDePasseTrèsSecurisé!
```

### `.env` (pour API locale)

```env
DATABASE_URL=postgres://app:dev_password_123@localhost:5432/appdb
```

## 🔧 Commandes

```bash
# Développement
bun run dev                 # API locale avec hot reload
bun run docker:dev:db       # DB uniquement
bun run docker:dev          # Tout avec Docker

# Production
bun run docker:prod         # Lance en prod

# Gestion
bun run docker:stop         # Arrête tout
bun run docker:logs         # Voir les logs
bun run docker:logs:api     # Logs API
bun run docker:clean        # Supprime tout

# Base de données
bun run db:generate         # Génère les migrations
bun run db:migrate          # Applique les migrations

# Build
bun run build               # Compile TypeScript
bun run start               # Lance le build
bun run test                # Tests
```

## 🔍 Healthcheck

```bash
# Dev
curl http://localhost:3000/health

# Prod
curl https://votredomaine.com/health

# État des conteneurs
docker compose ps
```

## 💾 Backup DB

```bash
# Backup
docker compose exec db pg_dump -U app appdb > backup.sql

# Restauration
docker compose exec -T db psql -U app appdb < backup.sql
```

## 🐛 Problèmes courants

### DB ne démarre pas

```bash
docker compose logs db
bun run docker:clean
bun run docker:dev:db
```

### Port déjà utilisé

```bash
lsof -i :3000  # API
lsof -i :5432  # DB
```

### Hot reload ne marche pas

Utiliser `bun run docker:dev` et non `docker compose up`
