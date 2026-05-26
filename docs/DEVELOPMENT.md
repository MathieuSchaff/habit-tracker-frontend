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

The monorepo has a `shared` TypeScript package. Docker does not always have the build cache at startup, so build the types locally first.

## Daily workflow

- Terminal 1: `just ts-check` — TypeScript watch mode on the host.
- Terminal 2: `just dev` — Docker development stack.

## Commands

### Development & types

| Command          | Description                        |
| :--------------- | :--------------------------------- |
| `just dev`       | Build types + start Docker         |
| `just dev-fresh` | Full cleanup + install + start     |
| `just ts-check`  | TypeScript watch mode (host)       |
| `just ts-build`  | Generate types and TanStack routes |
| `just ts-verify` | One-shot type check (host)         |
| `just diagnose`  | Check types and container state    |

### Quality & tests

| Command              | Description                    |
| :------------------- | :----------------------------- |
| `just lint-fix`      | Fix style with Biome           |
| `just format`        | Format code                    |
| `just test`          | Backend + frontend tests       |
| `just test-backend`  | Backend tests (isolated DB)    |
| `just test-frontend` | Vitest frontend tests          |
| `just test-db-reset` | Reset the test DB from scratch |

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
| `just db-studio`                    | Drizzle UI (http://localhost:4983) |
| `just db-seed`                      | Inject test data                   |
| `just db-reset`                     | Wipe + migrate + seed              |
| `just db-backup`                    | Backup to `./backups/`             |
| `just db-restore ./backups/xxx.sql` | Restore from a `.sql` file         |

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

Symptom: `Cannot find module '@habit-tracker/shared'` (legacy package name, kept for now to avoid an invasive rename across imports).

```bash
just ts-clean && just ts-build
```

Then restart Docker and make sure `just ts-check` is running in a separate terminal on the host.

### Docker issues

```bash
just stop
just dev-rebuild
just clean && just dev-fresh
```

## Production

1. Create `.env.prod` from `.env.prod.example`.
2. Update the domain and email in `scripts/just/ops.just` (`ssl-init`).
3. Run `just prod-migrate` to apply migrations.
4. Run `just prod` to start services.
5. Run `just ssl-init` to generate the SSL certificate.
