---
status: accepted
date: 2026-06-02
accepted: 2026-06-02
---

# Hybrid error handling strategy

Both throw-domain + global handler (default) and `ApiResponse` explicit (for semantically distinct error branches) are valid in Aurore's backend. Mixing styles within a single feature module is not. A third style — local route `try/catch` for isolated infra translation — exists in a small number of features and is intentional.

## Why

Two error styles emerged organically as the codebase grew: services throwing typed domain errors (translated by `globalErrorHandler`), and services returning `ApiResponse<T, E>` (mapped inline in routes). A third isolated infra-translation pattern appeared in uploads and ingredient-tags.

All DB work inside `withRlsContext` carries a hard invariant: errors must propagate (never be swallowed), because the middleware rolls back on `c.error`.

Without a documented strategy, future features risk mixing styles within a module, breaking the `globalErrorHandler` contract, or silently violating the RLS rollback invariant.

The three styles are codified in `docs/conventions/error-handling.md`.

## Considered options

- **Throw-only** — eliminates the dual style. Rejected: auth and admin flows use non-exceptional error branches that read more clearly as return values than thrown exceptions.
- **`ApiResponse`-only** — uniform, but adds boilerplate on every happy-path route. Rejected: throw-domain has lower noise for the majority of CRUD routes.
- **Per-route `try/catch` everywhere** — maximum explicit control. Rejected: duplicates the status-mapping logic already centralized in `globalErrorHandler`; each new error code requires updates across N route files.
- **Hybrid** — **Chosen.** Each style valid within its scope; choice made at the feature-module level and held consistently.

## Consequences

**Positive**
- Uniform JSON error shape: `{ success: false, error: code, details? }` across all routes.
- HTTP status codes centralized in `errorToStatus` + `baseErrorMapping`.
- `withRlsContext` rollback is reliable as long as the invariant holds.
- Frontend can key on `error.code` without parsing message strings.

**Negative**
- Two valid styles require discipline: contributors must read the convention before adding a feature module.
- `errorMappingRegistry` must stay in sync when new domain error classes are introduced (checklist in the convention doc).
- `AuthError` was never registered (auth uses Style B); `ReportError` missing but covered by `baseErrorMapping` codes.
