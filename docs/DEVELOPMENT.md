# Development

This document contains the operational details for running, testing and maintaining Aurore locally.

## Requirements

- Bun
- Docker
- mise
- just

## First-time setup

```bash
just init
$EDITOR .env.dev
just dev-fresh
```

Dev containers run TypeScript source directly. `just dev` runs `ts-build` first as a host-side preflight: it generates TanStack routes and checks TypeScript project references before Docker starts.

## Daily workflow

- Terminal 1: `just ts-check` — TypeScript watch mode on the host.
- Terminal 2: `just dev` — Docker development stack.

## Before Push Or PR

Run the checks that match your change.

| Change | Command |
| :----- | :------ |
| Any code change | `just audit-code` |
| Backend or shared logic | `just test-backend` |
| Frontend components, hooks or UI logic | `just test-frontend` |
| Full non-E2E check | `just test` |
| User flow changed in the browser | `just e2e` |
| CSP, frontend deps or `frontend/src/main.tsx` changed | `just test-csp` |

Quick path for most PRs:

```bash
just audit-code
just test
```

Add `just e2e` when the change touches a real browser flow.

## Commands

### Development & types

| Command          | Description                        |
| :--------------- | :--------------------------------- |
| `just dev`       | Typecheck + start Docker           |
| `just dev-fresh` | Full cleanup + install + start     |
| `just ts-check`  | TypeScript watch mode (host)       |
| `just ts-build`  | Generate types and TanStack routes |
| `just ts-verify` | One-shot type check (host)         |

### Quality & tests

| Command              | Description                         |
| :------------------- | :---------------------------------- |
| `just audit-code`    | Full local audit, reports in `.audit-out/` |
| `just lint-fix`      | Fix style with Biome                |
| `just test`          | Backend + frontend tests            |
| `just test-backend`  | Backend tests (isolated DB)         |
| `just test-frontend` | Vitest frontend tests               |

See [`TESTING.md`](TESTING.md) for the quick map of backend, frontend and E2E test layers.

### Backend tests

Keep the test DB running during your session:

```bash
just test-db-up
```

Run targeted tests:

```bash
just test-dev "products"
just test-dev "features/products/tests/products.routes.test.ts"
```

Watch mode:

```bash
just test-dev-watch "products"
```

Each test `beforeEach` cleans tables via `cleanDatabase`, so there is no need to restart Docker between tests.

### E2E

The E2E stack uses isolated ports and can run next to the development stack.

```bash
just e2e-up
just e2e
```

Useful commands:

| Command          | Description                         |
| :--------------- | :---------------------------------- |
| `just e2e-up`    | Start the E2E stack                 |
| `just e2e`       | Run Playwright suites               |
| `just e2e-ui`    | Run Playwright in interactive mode  |
| `just e2e-reset` | Recreate the E2E stack from scratch |
| `just e2e-down`  | Stop the E2E stack                  |

### Database

| Command                             | Description                        |
| :---------------------------------- | :--------------------------------- |
| `just db-generate`                  | Generate a SQL migration file      |
| `just db-migrate`                   | Apply migrations locally           |
| `just db-push`                      | Sync schema without migration      |
| `just db-seed`                      | Push CORE catalog seed (idempotent) |
| `just db-reset`                     | Wipe + migrate + seed              |
| `just db-backup`                    | Backup to `./backups/`             |
| `just db-restore ./backups/xxx.sql` | Restore from a `.sql` file         |
| `just db-snapshot`                  | Dump DB → `data.sql` (dev source of truth) |
| `just db-snapshot-load`             | Reload `data.sql` (⚠ truncates tables)     |
| `just db-snapshot-reset`            | Clean + migrate + load `data.sql`          |

For product catalogue imports, see [`CATALOGUE_SEEDING.md`](CATALOGUE_SEEDING.md).

| Command                                      | Description                                      |
| :------------------------------------------- | :----------------------------------------------- |
| `just ingest-catalogue path/to/products.jsonl` | Dry-run a bulk product lot through `createProduct` |
| `WRITE=1 just catalogue-apply path/to/products.jsonl` | Apply a dev lot, run catalogue audits, refresh snapshot |
| `just catalogue-gate`                        | Run DB + CDN audits, then refresh `data.sql`     |

### One-liners (no recipe)

Simple commands kept out of the justfile on purpose. Dev containers have pinned
names `app_api`, `app_db`, `app_frontend`; the E2E stack uses `e2e_api`, `e2e_db`,
`e2e_frontend`.

```bash
# Containers
docker ps --filter name=app_             # container status + health
docker logs -f app_api                   # follow logs (any container name above)
docker exec -it app_frontend /bin/sh     # shell into a container
docker stats --no-stream                 # resource usage
docker rmi aurore-frontend aurore-api    # drop project images (force rebuild)
just dev-down && just dev                # restart the dev stack

# Quality
bunx biome format --write .              # format only (`just lint-fix` includes it)
npx fallow audit --format compact        # new issues vs main
npx fallow dupes                         # duplication scan
npx fallow health                        # complexity scan

# GUIs & watch modes
cd frontend && bunx vitest               # frontend tests, watch mode
cd frontend && bunx vitest --ui          # frontend tests, web UI
(cd backend && set -a && . ../.env.dev && set +a && bunx drizzle-kit studio --port 4983)
(cd backend && DATABASE_URL=postgres://app:testpassword@localhost:5433/appdb_test bunx drizzle-kit studio --port 4982)
```

## Vendored `algo-derm`

`algo-derm` is a separate MIT library (`../algo-derm`) that computes the formula assessment from an INCI list. It is vendored into the backend as a tarball because Docker cannot read outside the build context.

```bash
just vendor-algo-derm
just reinstall-backend
```

Backend-only: the frontend receives the precomputed `ProductAssessment`. The bundled dataset is not shipped to the browser.

## Configuration

- `.env.dev` — development, do not commit.
- `.env.prod` — production, do not commit.
- `.env.example` — development template.
- `.env.prod.example` — production template.

## Ports

| Service        | Port |
| :------------- | :--- |
| Frontend       | 5173 |
| API            | 3000 |
| DB             | 5432 |
| Test DB        | 5433 |
| E2E Frontend   | 5174 |
| E2E API        | 3001 |
| E2E DB         | 5434 |
| Drizzle Studio | 4983 |

## Troubleshooting

### Editor shows errors / Docker crashes at startup

Symptom: `Cannot find module '@aurore/shared'` usually means workspace dependencies are stale or missing. Reinstall deps and rebuild the Docker image.

```bash
bun install
just dev-rebuild
```

For editor/type errors, also run `just ts-check` in a separate terminal on the host.

### Docker issues

```bash
just stop                     # stop all stacks
just dev-rebuild              # rebuild images (DB preserved)
just clean-soft               # drop containers, keep volumes (DB safe)
just clean && just dev-fresh  # ⚠ destroys ALL Docker data incl. the local DB (pgdata)
```

## Production

1. Create `.env.prod` from `.env.prod.example` and fill **every** secret — the API validates env at boot (`backend/src/config/env.ts`) and crash-loops if any required var is missing.
2. Run `just prod` to start services.
3. Run `just prod-migrate` to apply migrations (execs into the running api container).
4. Run `just ssl-init <apex-domain> <email>` to generate the SSL certificate for the apex and `www` hostnames.
