# Habit Tracker - Monorepo Fullstack

Une application complète de suivi d'habitudes et de gestion de produits (skincare/dermo) avec analyse d'ingrédients. Développée avec Bun, Hono, React et Drizzle ORM.

## 🚀 Fonctionnalités principales

- **Suivi d'habitudes** : Système complet de tracking quotidien.
- **Gestion de produits** : Inventaire de produits personnels (stock, péremption).
- **Analyse d'ingrédients** : Analyse dermatologique des compositions (ingrédients, profils dermo).
- **Gestion de tâches** : Système de listes de tâches intégré.
- **Logs & Sentiment** : Suivi de l'état d'esprit et notes quotidiennes.
- **Authentification complète** : Login/Signup, vérification d'email, tokens de rafraîchissement.
- **Multi-plateforme** : Web-first avec architecture prête pour mobile.

## 🛠️ Stack Technique

- **Runtime** : [Bun](https://bun.sh/)
- **Backend** : [Hono](https://hono.dev/) (API REST + Hono RPC pour les types)
- **Frontend** : [React](https://react.dev/) + [Vite](https://vitejs.dev/) + [TanStack Router](https://tanstack.com/router) & [Query](https://tanstack.com/query)
- **Base de données** : [PostgreSQL 18](https://www.postgresql.org/) + [Drizzle ORM](https://orm.drizzle.team/)
- **Styling** : Vanilla CSS + [Lucide Icons](https://lucide.dev/)
- **Qualité** : [Biome](https://biomejs.dev/) (Lint & Format) + [Vitest](https://vitest.dev/) (Tests)
- **Infrastructure** : [Docker Compose](https://docs.docker.com/compose/) + [Nginx](https://www.nginx.com/) + [Certbot](https://certbot.eff.org/)

---

## 🚀 Démarrage rapide (Première fois)

> [!IMPORTANT]
> **Étape CRITIQUE pour le premier lancement** : Le monorepo utilise TypeScript au niveau de la racine (`/`) pour gérer les dépendances entre les packages (`shared`, `backend`, `frontend`). 
> Comme Docker ne possède pas toujours le cache de build TypeScript au démarrage, vous **DEVEZ** build les types localement avant de lancer Docker.

```bash
# 1. Installer les dépendances (nécessite Bun)
make install-deps

# 2. Copier et remplir les variables d'environnement
cp .env.example .env.dev

# 3. Lancer l'environnement complet (build les types automatiquement)
make dev-fresh
```

**Workflow quotidien** :
1. Terminal 1 : `make ts-check` (Watch mode local pour synchroniser les types pendant que vous codez)
2. Terminal 2 : `make dev` (Build les types + Docker compose)

---

## 📋 Commandes Essentielles (Makefile)

### Développement & Types
| Commande | Description |
| :--- | :--- |
| `make dev` | Build les types + Lance l'environnement (Docker) |
| `make dev-fresh` | Nettoyage complet + Installation + Lancement |
| `make ts-check` | **Indispensable** : Watch mode pour TypeScript (Hôte) |
| `make ts-build` | Génère les types et les routes TanStack (Hôte) |
| `make diagnose` | Vérifie l'état des types et des conteneurs |

### Qualité & Tests
| Commande | Description |
| :--- | :--- |
| `make lint-fix` | Corrige les erreurs de style avec Biome |
| `make format` | Formate le code proprement |
| `make test` | Lance les tests backend (avec DB isolée) |
| `make test-frontend` | Lance les tests Vitest du frontend |
| `make test-all` | Lance l'intégralité de la suite de tests |

### Base de Données
| Commande | Description |
| :--- | :--- |
| `make db-generate` | Génère une nouvelle migration SQL |
| `make db-migrate` | Applique les migrations en local |
| `make db-push` | Synchronise le schéma sans migration (dev rapide) |
| `make db-studio` | Interface visuelle Drizzle (http://localhost:4983) |
| `make db-seed` | Injecte les données de test |
| `make db-reset` | **NUKE DB** : Clean + Push + Seed |

---

## 📂 Structure du Monorepo

```
/
├── backend/            # API Hono (Types exportés via Hono RPC)
├── frontend/           # SPA React (Vite + TanStack)
├── shared/             # Schémas Zod et Types partagés (Source de vérité)
├── nginx/              # Configuration reverse proxy (Prod)
├── backups/            # Sauvegardes de la base de données
├── Makefile            # Point d'entrée unique des commandes
├── docker-compose.yml  # Config Docker de base (Postgres 18)
└── biome.json          # Config Linting & Formatting
```

---

## ⚙️ Configuration

### Variables d'environnement
- `.env.dev` : Configuration de développement (⚠️ **NE JAMAIS COMMITER**).
- `.env.prod` : Configuration de production (⚠️ **NE JAMAIS COMMITER**).
- `.env.example` : Modèle pour créer vos fichiers `.env.dev` et `.env.prod`.

### Ports utilisés
| Service | Port Dev | Notes |
| :--- | :--- | :--- |
| Frontend | `5173` | Accès via http://localhost:5173 |
| API | `3000` | Accès direct via http://localhost:3000/api |
| DB | `5432` | PostgreSQL 18 |
| DB Test | `5433` | Pour les tests isolés |
| Studio | `4983` | Drizzle Studio |

---

## 🐛 Guide de survie : "Ca ne marche pas"

### Problèmes de types (L'éditeur est rouge ou Docker crash)
**Symptôme** : `Cannot find module '@habit-tracker/shared'` ou erreurs de types au démarrage de l'API.
1. Vérifiez que `make ts-check` tourne dans un terminal séparé sur votre machine hôte.
2. Forcez un rebuild global : `make ts-clean && make ts-build`.
3. Relancez Docker après le build réussi des types.

### Problèmes Docker
- **Erreur de port déjà utilisé** : `make stop` puis relancez.
- **Changement de dépendances** : `make dev-rebuild` pour forcer le build des images.
- **Nuke total** : `make clean && make dev-fresh`.

---

## 🚢 Mise en production (Checklist)

1. Créer le fichier `.env.prod` à partir de `.env.example`.
2. Modifier le domaine et l'email dans le `Makefile` (`ssl-init`).
3. Appliquer les migrations sur la prod : `make prod-migrate`.
4. Lancer les services : `make prod`.
5. Générer le certificat SSL : `make ssl-init`.

---

## 📖 Maintenance

- **Backup DB** : `make db-backup` (crée un .sql dans `./backups/`).
- **Restore DB** : `make db-restore FILE=backups/mon_fichier.sql`.
- **Update deps** : Modifier les `package.json` respectifs puis `make clean-install`.

---

Développé avec ❤️ pour un suivi d'habitudes rigoureux.
