# Testing

This page is the quick map for local test commands. Detailed backend test authoring rules live in
[`docs/conventions/backend-tests.md`](conventions/backend-tests.md).

## TL;DR

| Need | Command |
| :--- | :------ |
| Everything except E2E | `just test` |
| Backend full suite | `just test-backend` |
| Backend targeted loop | `just test-dev "<pattern>"` |
| Frontend Vitest suite | `just test-frontend` |
| E2E Playwright suite | `just e2e` |
| Recreate E2E stack and reseed DB | `just e2e-up` or `just e2e-reset` |
| Prod CSP regression guard | `just test-csp` |
| Auth SSR production-build guard | `just test-auth-ssr` |
| Full code audit before PR | `just audit-code` |

## Before Push Or PR

For most PRs, run:

```bash
just audit-code
just test
```

Add `just e2e` when the browser flow changed. Add `just test-csp` when CSP, frontend deps, or `frontend/src/client.tsx` changed. Add `just test-auth-ssr` when auth boot, hydration, or the root SSR shell changed.

## Generated Results

Most test commands print only in the terminal. These commands also write files:

| Command | Output |
| :------ | :----- |
| `just audit-code` | `.audit-out/*.txt` |
| `just test-backend-coverage` | `backend/coverage/` |
| `just test-frontend-coverage` | `frontend/coverage/` |
| `just e2e` | `frontend/test-results/` on failures; `frontend/playwright-report/` when a report is opened or generated |
| `just test-bench` | `/tmp/aurore-backend-test.log` and `/tmp/aurore-backend-test.time` |
| `just ts-build && cd frontend && ANALYZE=1 bunx vite build` | `frontend/stats.html` (bundle treemap), `frontend/dist/analyze-data.md` (rolldown report) |

These paths are local outputs and are ignored by Git. Clean them all with:

```bash
rm -rf .audit-out backend/coverage frontend/coverage frontend/test-results \
    frontend/playwright-report frontend/blob-report frontend/.playwright \
    frontend/stats.html frontend/dist/analyze-data.md
```

## Backend Tests

Backend tests use `bun:test` against an isolated PostgreSQL database on port `5433`.

`just test-backend` starts the test DB, applies migrations, and runs the backend suite.
For daily work, keep the DB running with `just test-db-up`, then use:

```bash
just test-dev "products"
just test-dev "features/products/tests/products.routes.test.ts"
```

DB-backed backend tests clean tables between tests. Normal backend test loops do not require a Docker
restart.

## Frontend Tests

Frontend tests use Vitest and jsdom.

Run them with:

```bash
just test-frontend
```

Use this layer for components, hooks, forms, query serialization, and UI behavior that does not need a
real browser or backend.

## E2E Tests

E2E tests use Playwright against the Docker E2E stack:

| Service | Port |
| :------ | :--- |
| Frontend | `5174` |
| API | `3001` |
| DB | `5434` |

Start or refresh the stack with:

```bash
just e2e-up
```

Run the suite with:

```bash
just e2e
```

`just e2e` reuses an existing server on `5174` when one is already alive. Source changes in
`frontend/src` are bind-mounted into the container, so they do not need an image rebuild. Rebuild the
E2E stack when package dependencies, Docker config, migrations, or the DB snapshot changed.

## CSP Guard

`just test-csp` builds the production bundle, serves it with the Content-Security-Policy taken from the
nginx template, and drives headless chromium to fail on any CSP violation. Run it after editing the CSP,
adding a frontend dependency, or touching `frontend/src/client.tsx`. Local-only (not part of CI).

## Auth SSR Guard

`just test-auth-ssr` builds the production bundle, starts the generated Bun server, and hydrates it in
headless Chromium. It verifies the hinted server shell (on `/` and `/products`) and the four client
outcomes: failed refresh, hint gone before hydration, restored session, and anonymous visitor without
a hint. Every page also fails on hydration-mismatch console errors. Run it after editing auth boot,
the root loader, or the server-hint context. Local-only (not part of CI).

## Common Traps

- Playwright has `reuseExistingServer: true`, so a stale E2E container can survive between runs.
- New frontend packages require `just e2e-up` so the Docker image gets fresh `node_modules`.
- E2E writes to the isolated E2E DB; `just e2e-up` reseeds it from the committed snapshot.
- Backend DB tests already clean per test; do not restart Docker for normal targeted backend loops.
