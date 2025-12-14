# 🎯 Habit Tracker Backend

Stack Bun + PostgreSQL + Nginx + Certbot orchestrée avec Docker.

## 📚 Documentation

- **[README.dev.md](./README.dev.md)** - Développement local
- **[README.prod.md](./README.prod.md)** - Déploiement production

## 🏗️ Stack

| Composant       | Technologie             |
| --------------- | ----------------------- |
| Runtime         | Bun 1.x                 |
| Base de données | PostgreSQL 16           |
| Reverse Proxy   | Nginx 1.27              |
| SSL/TLS         | Certbot (Let's Encrypt) |

## 🚀 Démarrage rapide

### Mode développement

```bash
# Sans Docker (recommandé)
bun install
bun run dev

# Avec Docker
docker compose up -d db  # Juste la DB
```

👉 Voir [README.dev.md](./README.dev.md) pour les détails

### Mode production

```bash
# Créer .env
echo "POSTGRES_PASSWORD=votre_password" > .env

# Démarrer la stack complète
docker compose up -d --build
```

👉 Voir [README.prod.md](./README.prod.md) pour SSL et configuration complète

## 📦 Structure

```
├── src/                      # Code source
├── nginx/conf.d/            # Configuration Nginx
├── docker-compose.yml       # Orchestration
├── Dockerfile              # Multi-stage (dev + prod)
└── .env                    # Variables (non versionné)
```

## 🔐 Sécurité

- API et DB isolées dans le réseau Docker `appnet`
- Seul Nginx exposé publiquement (ports 80/443)
- Certificats SSL gratuits avec Let's Encrypt
- Renouvellement automatique toutes les 12h

## 📝 Variables d'environnement

Créer `.env` à la racine :

```env
POSTGRES_PASSWORD=votre_mot_de_passe_securise
```

## 🔧 Commandes utiles

```bash
# Logs
docker logs -f app_api

# Redémarrer
docker compose restart

# Arrêter
docker compose down

# Nettoyer
docker compose down -v
```

## 📞 Support

- Issues GitHub
- Logs : `docker compose logs -f`
- Healthcheck : `curl http://localhost/health`

---

**Voir README.dev.md ou README.prod.md selon votre contexte**
