# Aurore — Skincare Research Memory

I was tired of switching between brand websites, copying INCI lists into a spreadsheet, then pasting them into an AI to get an opinion — and losing everything between sessions. A folder of dead Markdown notes I never opened again.

Aurore centralises that: a personal database of skincare products and ingredients, with the **decision trail** kept beside each product — why it's still a candidate, why it was rejected, what fits the user's own goals. Calm by design, no scores, no medical claims, no shopping pressure.

---

## At a glance

Aurore is a full-stack skincare research app for people who compare formulas before buying.

It lets users:

- save skincare products in a personal database;
- parse and structure INCI ingredient lists;
- keep notes and decision states beside each product;
- compare formulas without fake scores or medical claims;
- preserve the reasoning behind each skincare decision.

Built as a production-grade TypeScript monorepo with React, Hono, PostgreSQL, RLS, Docker, tests and E2E coverage.

## What Aurore is

A calm skincare shelf and formula notebook for people who **compare formulas before buying** — formula-conscious buyers, INCI readers, AI-skincare overthinkers.

The core loop:

```text
collect products → understand formulas → compare candidates
→ decide (keep / wishlist / reject) → come back later without losing the reasoning
```

**Decision states** (FR labels in the UI): `Wishlist`, `En cours`, `Saint Graal`, `À éviter`. `À éviter` is a first-class state, not a trash bin — it remembers *why* a product was rejected so the same research loop doesn't repeat.

## What Aurore isn't

- Not a medical tool or diagnostic system.
- Not a universal "best product for you" oracle.
- Not a safety score or Yuka-style verdict.
- Not a shopping app or influencer platform.

---

## Core features

**Products & ingredients**

- Personal database of cosmetic products.
- INCI parsed into structured ingredients: role, family, notes.
- Tag system for filtering and auto-tagging from formula signals.
- Per-product personal note and decision state.
- Product comparison without winners, scores, or fake precision.

**Research memory**

- Candidate, wishlist, holy-grail and rejection states.
- Rejection reasons kept as useful memory, not discarded history.
- A product page designed around context: formula, notes, decision and assessment.

**Auth & data boundaries**

- Email + password auth with Argon2 via Bun.
- Google OAuth.
- Short-lived access token plus refresh token rotation in an HttpOnly cookie.
- Row-Level Security at the Postgres level — see [`SECURITY.md`](./docs/SECURITY.md).

## Formula assessment

Aurore computes a backend-side formula assessment from the INCI list, based on risk, benefit and confidence axes.

It is not a medical diagnosis, not a safety score, and not a universal recommendation. Its purpose is to help users structure their own research and compare formulas more calmly.

The assessment logic lives in a separate MIT library (`algo-derm`) vendored as a backend tarball. The frontend receives only the precomputed `ProductAssessment`; the bundled dataset never ships to the browser.

## Technical highlights

- Full-stack TypeScript monorepo with shared Zod contracts between frontend and backend.
- Hono backend with REST API and typesafe RPC.
- PostgreSQL 18 with Drizzle migrations and Row-Level Security.
- Secure auth: Argon2, short-lived access tokens, refresh token rotation, HttpOnly cookies, Google OAuth.
- Backend-computed formula assessment, kept out of the browser bundle.
- Isolated backend test database, frontend tests and Playwright E2E suite.
- Docker Compose environments for development, testing and production.
- Nginx + SSL production setup.

## Architecture

```text
React 19 + TanStack Router/Query
        │
        │ shared Zod schemas
        ▼
Hono API / RPC
        │
        ├── Auth: Argon2, JWT, Google OAuth
        ├── Formula assessment: algo-derm
        └── Product services
        │
        ▼
PostgreSQL 18 + Drizzle + RLS
```

```text
aurore/
├── backend/            # Hono API (Route → Service → DB)
├── frontend/           # React SPA (Vite + TanStack Router/Query)
├── shared/             # Shared Zod schemas (source of truth)
├── vendor/             # Vendored deps (algo-derm tarball)
├── infra/              # Docker, Nginx, keys, ops config
├── backups/            # DB backups
├── scripts/            # Automation scripts (incl. just recipes)
└── docs/               # Public project docs
```

## Stack

| Layer          | Technology                                             |
| :------------- | :----------------------------------------------------- |
| Runtime        | Bun                                                    |
| Backend        | Hono (REST API + typesafe RPC)                         |
| Frontend       | React 19, TanStack Router & Query                      |
| Database       | PostgreSQL 18 + Drizzle ORM                            |
| Validation     | Zod (shared between front and back)                    |
| Styling        | Vanilla CSS + Lucide Icons                             |
| Quality        | Biome (lint & format) + Vitest + Playwright + Lefthook |
| Infrastructure | Docker Compose + Nginx                                 |

---

## Quick start

> **Important**: `just dev` runs a host-side TypeScript preflight before Docker starts. Dev containers execute TypeScript source directly; host `dist/` files are for typechecking, not runtime.

```bash
# First-time setup: deps, hooks and env template
just init

# Fill in secrets
$EDITOR .env.dev

# Start the full development environment
just dev-fresh
```

Daily workflow:

- `just ts-check` — TypeScript watch mode on the host.
- `just dev` — Docker development stack.

See [`docs/DEVELOPMENT.md`](./docs/DEVELOPMENT.md) for commands, tests, database workflows, production notes and troubleshooting.

## Documentation

**Engineering**

- [`DEVELOPMENT.md`](./docs/DEVELOPMENT.md) — setup, commands, tests, database workflows and troubleshooting.
- [`TESTING.md`](./docs/TESTING.md) — backend, frontend and E2E test command map.
- [`conventions/`](./docs/conventions/) — backend tests, dates, error handling.

**Policy**

- [`SECURITY.md`](./docs/SECURITY.md) — auth model, RLS, DB role separation.
- [`PRIVACY.md`](./docs/PRIVACY.md) — RGPD policy, data handling.