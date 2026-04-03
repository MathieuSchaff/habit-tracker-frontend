# Aurore — Skincare Inventory & Routine Tracker

I was tired of switching between brand websites, copying INCI lists into a spreadsheet, then pasting them into an AI to get an opinion — and losing everything between sessions. I had a folder full of dead Markdown files that I never opened anymore.

Aurore centralizes all of that: a personal database of products and ingredients, with inventory tracking and routine management in one place. It's designed around low cognitive load — one action at a time, no streaks, no punishment mechanics.

---

## Features

**Products & ingredients**
- Personal database of cosmetic products and supplements
- Ingredients linked to each product: role, origin, notes
- Tags for quick filtering
- Inventory tracking: what you have, what you're testing, what you're using

**Tasks**
- Simple tasks, no streaks, no pressure

**Habits** *(in progress)*
- Recurring routines without guilt mechanics

---

## Stack

| Layer | Technology |
| :--- | :--- |
| Runtime | Bun |
| Backend | Hono (REST API + typesafe RPC) |
| Frontend | React 19, TanStack Router & Query |
| Database | PostgreSQL 18 + Drizzle ORM |
| Validation | Zod (shared between front and back) |
| Styling | Vanilla CSS + Lucide Icons |
| Quality | Biome (lint & format) + Vitest |
| Infrastructure | Docker Compose + Nginx |

---

## What I learned building this

- **Monorepo with a shared package**: sharing Zod schemas between backend and frontend eliminates type drift. I'd never set this up before.
- **Hono RPC**: the pattern of exporting `AppType` from the backend and consuming it with `hc()` on the frontend took time to understand, but once it clicked, API contract mismatches started appearing directly in the editor — no OpenAPI spec, no codegen step.
- **Drizzle ORM**: the SQL-first approach forced me to actually understand my queries instead of relying on an opaque abstraction.
- **TanStack Router**: the file-based routing convention and `createFileRoute` are not obvious at first, especially when wiring up typesafe search params. Once it's set up, navigating to a route that doesn't exist is a compile error instead of a runtime blank screen.
- **Error handling**: building a global handler that correctly distinguishes expected HTTP errors (validation failures, 404s) from unexpected runtime errors took several rewrites. The tricky part was deciding what to expose in production vs. development.

---

## Quick start

> **Important**: the monorepo has a `shared` TypeScript package. Docker doesn't always have the build cache at startup, so build the types locally first.

```bash
# 1. Install dependencies (requires Bun)
make install-deps

# 2. Copy and fill in environment variables
cp .env.example .env.dev

# 3. Start the full environment
make dev-fresh
```

**Daily workflow:**
- Terminal 1: `make ts-check` — TypeScript watch mode on the host
- Terminal 2: `make dev` — Docker

---

## Commands

### Development & types

| Command | Description |
| :--- | :--- |
| `make dev` | Build types + start Docker |
| `make dev-fresh` | Full cleanup + install + start |
| `make ts-check` | TypeScript watch mode (host) |
| `make ts-build` | Generate types and TanStack routes |
| `make diagnose` | Check types and container state |

### Quality & tests

| Command | Description |
| :--- | :--- |
| `make lint-fix` | Fix style with Biome |
| `make format` | Format code |
| `make test` | Backend tests (isolated DB) |
| `make test-frontend` | Vitest frontend tests |
| `make test-all` | Full test suite |
| `make test-db-reset` | Reset the test DB from scratch |

### Backend tests (recommended workflow)

Keep the test DB running during your session:

```bash
make test-db-up  # once per session, starts Docker on port 5433
```

Run targeted tests:

```bash
make test-dev ARGS="habits"
make test-dev ARGS="features/habits/tests/habits.routes.test.ts"
```

Watch mode (TDD):

```bash
make test-dev-watch ARGS="habits"
```

> Each test (`beforeEach`) cleans tables via `cleanDatabase` — no need to restart Docker between tests.

### Database

| Command | Description |
| :--- | :--- |
| `make db-generate` | Generate a SQL migration file |
| `make db-migrate` | Apply migrations locally |
| `make db-push` | Sync schema without migration |
| `make db-studio` | Drizzle UI (http://localhost:4983) |
| `make db-seed` | Inject test data |
| `make db-reset` | Wipe + push + seed |
| `make db-backup` | Backup to `./backups/` |
| `make db-restore FILE=...` | Restore from a `.sql` file |

---

## Structure

```text
habit-tracker/
├── backend/            # Hono API
├── frontend/           # React SPA (Vite + TanStack)
├── shared/             # Shared Zod schemas (source of truth)
├── nginx/              # Reverse proxy (production)
├── backups/            # DB backups
├── Makefile            # Command entry point
└── docker-compose.yml  # PostgreSQL 18
```

---

## Configuration

- `.env.dev` — development (do not commit)
- `.env.prod` — production (do not commit)
- `.env.example` — template to copy

**Ports:**

| Service | Port |
| :--- | :--- |
| Frontend | 5173 |
| API | 3000 |
| DB | 5432 |
| Test DB | 5433 |
| Drizzle Studio | 4983 |

---

## Troubleshooting

**Editor shows errors / Docker crashes at startup**

Symptom: `Cannot find module '@habit-tracker/shared'`

```bash
make ts-clean && make ts-build  # rebuild types
# then restart Docker
```

Make sure `make ts-check` is running in a separate terminal on the host.

**Docker issues**

```bash
make stop          # port already in use
make dev-rebuild   # after a dependency change
make clean && make dev-fresh  # nuclear reset
```

---

## Production

1. Create `.env.prod` from `.env.example`
2. Update the domain and email in the `Makefile` (`ssl-init`)
3. `make prod-migrate` — apply migrations
4. `make prod` — start services
5. `make ssl-init` — generate SSL certificate
