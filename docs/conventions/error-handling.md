# Error Handling Convention

Decision record: `docs/adr/0007-error-handling-strategy.md`

---

## Architecture overview

**Global translation layer**: `backend/src/utils/errors/error-handler.ts`
Registered as `app.onError(globalErrorHandler)` in `backend/src/index.ts`.

**Base error codes + status mapping**: `shared/src/core/index.ts`
`baseErrorMapping` covers transverse codes (`invalid_input`, `not_found`, `unauthorized`,
`forbidden`, `server_error`, `rate_limit_exceeded`). `errorToStatus(base, custom)` merges
and falls back to `500`.

**RLS rollback invariant**: `backend/src/features/auth/rls-context.middleware.ts`
`withRlsContext` rolls back on `c.error`. Never swallow a DB error inside an RLS-guarded
request handler.

---

## Style A — throw-domain + global handler (default)

Use for all standard CRUD features.

```
Service  →  throws XxxError('some_code')
Route    →  happy-path only, no try/catch
Handler  →  globalErrorHandler translates to { success: false, error: code }
```

**DB translation**: catch only to convert known constraint violations (e.g. `isUniqueViolation`),
convert to a domain code, then **rethrow**. Never swallow.

Examples: `products`, `ingredients`, `tasks`, `discussions`, `product-comparisons`, `blog`

---

## Style B — `ApiResponse` explicit

Use when error branches are semantically distinct outcomes (not failures), and you want the
call-site to handle them without exception control flow.

```
Service  →  returns ApiResponse<T, E>
Route    →  if (!isApiSuccess(result)) return c.json(err(result.error), errorToStatus(...))
```

Examples: `auth/service.ts`, `admin/bans.service.ts`, `admin/moderation.service.ts`

---

## Style C — local route try/catch (narrow, opt-in)

Use only to translate infra-level exceptions that are specific to one feature and don't belong
in a shared domain error class. Re-throw everything else.

Examples: `uploads/routes.ts`, `products/product-ingredients/routes.ts`,
`ingredients/ingredient-tags/routes.ts`

---

## Rules

1. **Pick one style per feature module and stay consistent within it.** Don't mix A and B
   inside the same `routes.ts` / `service.ts` pair.

2. **Never mix styles within `withRlsContext`.** Any swallowed error breaks the rollback
   contract.

3. **Route structure**:
   - Validate at the boundary via `zValidator`
   - Return success with `ok(data)` + appropriate HTTP status constant
   - Let errors propagate (style A) or return explicitly (style B)

---

## Checklist — adding a new domain error code

1. Add the error code type to `shared/src/<feature>/schemas.ts` (or a sibling file)
2. Add / update the HTTP mapping (`xxxErrorMapping`) in the same shared file
3. Add / update the domain error class in `backend/src/features/<feature>/<feature>-error.ts`
4. If using style A: register the mapping in `errorMappingRegistry` inside
   `backend/src/utils/errors/error-handler.ts`
5. Add integration tests asserting the HTTP status code and `error` payload field

---

## Known registry state (as of 2026-05-21)

| Entry | Status |
|---|---|
| `AuthError` in registry | Stale — no `AuthError` class in use (auth uses style B) |
| `ReportError` | Missing from registry — safe for now (codes fall through to `baseErrorMapping`) |

Update the registry when extending `ReportError` with non-base codes.
