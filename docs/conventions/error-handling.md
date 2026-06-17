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

1. **Pick one style per feature module and stay consistent within it.** Don't mix A and B for
   the *same* operation. House norm is pure throw: a single-row read that finds nothing throws
   `XxxError('..._not_found')` just like a write, so the route stays happy-path. The
   read-null/write-throw split (reads return `T | null`, route maps the null with `err(...)`) is
   tolerated but non-standard — no CRUD entity feature uses it. If you ever do map a null in a
   route, derive the status via `errorToStatus(code, xxxErrorMapping)`, never a hardcoded constant,
   so it can't drift from the registry.

2. **Never mix styles within `withRlsContext`.** Any swallowed error breaks the rollback
   contract. Best-effort logs (`logSecurityEvent`, `trackError`, audit writes) must run off the
   request tx — pass the base pool (`baseDb`), not `c.get('db')` — or be wrapped in a nested
   `transaction()` (savepoint) so a failed log can't abort the request tx.

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

## Known registry state (as of 2026-06-09)

| Entry | Status |
|---|---|
| `ReportError` | Missing from registry — safe for now (codes fall through to `baseErrorMapping`) |

Update the registry when extending `ReportError` with non-base codes.

---

## Frontend consumption (TanStack Query)

The backend envelope (`{ success: false, error: <code> }` + HTTP status) is consumed in
`frontend/src/lib/queries/<domain>.ts`. Two rules keep failures recoverable instead of fatal.

### Read queryFns throw `ApiError`, never bare `Error`

The global query retry guard (`frontend/src/lib/queryClient.ts`) skips retries on 4xx:
`if (isApiError(err) && err.status >= 400 && err.status < 500) return false`. A bare
`new Error()` carries no `status`, so the guard can't recognise a 429/4xx → React Query
retries once, doubling failed calls and holding skeletons through the retry cycle.

Read queryFns (inside `queryOptions` / `useQuery`) must therefore:

```ts
const res = await api.<resource>.$get(...)
if (!res.ok) throw new ApiError('http_error', res.status)   // status feeds the retry guard
const json = await res.json()
return json.data
```

Keep the `if (!res.ok) throw` form — TS uses it to narrow `res.json()` to the success variant
of the Hono RPC union. (`throwIfNotOk` returns `Promise<void>`, so it does NOT narrow; using it
forces an extra `if (!json.success) throw` to re-narrow.)

Exempt — leave as-is, don't churn:
- **Mutations** (`useMutation`/`mutationFn`) — not retried (guard is `defaultOptions.queries`
  only).
- **Auth probes** `session` / `me` / `health` — already `retry: false`, immune by design.
- `if (!json.success)` throws — fire on 2xx, not the retry concern.

### Loaders: `prefetchQuery` when components own their error UI

A route `loader` calling `ensureQueryData` **throws** on fetch failure → loader rejects →
TanStack Router renders the route `errorComponent` (full-page `GlobalError`). When the page's
components already degrade (own `isError` → `EmptyState`, undefined guards), use `prefetchQuery`:
it warms the cache without throwing, so a failed fetch falls through to the in-page error UI
instead of replacing the whole page. Use `ensureQueryData` only when the data is mandatory for
the route to render at all.

**Coverage (not audited).** 28 route loaders use `ensureQueryData`, 3 use `prefetchQuery`. Many
`ensureQueryData` uses are correct — the route can't render without the data (a missing product →
full-page 404 is the right outcome). The risk is a **secondary, degradable** fetch wrongly making
the page fatal: the `/blog` P0 (a failed category-counts fetch killed the whole page) was exactly
this, and only `/blog` has been triaged. Any loader fetching more than its one mandatory entity is
a candidate for `prefetchQuery` + in-page degradation.

### Known gap — code collapsed to `http_error`

Read failures throw `ApiError('http_error', res.status)`: **status kept, the backend's specific
`error` code discarded**. Fine for reads (generic `EmptyState`). To surface a code — e.g.
"rate-limited, retry in Ns" from `rate_limit_exceeded` + `retry-after` — route that read through
`throwIfNotOk(res)` (parses the envelope) and re-narrow with `if (!json.success)`.

**P1 wired 2026-06-17.** The 6 highest-traffic reads (`products`/`ingredients` × `search` +
`searchInfinite`/`searchFlat` + `list`) now route through `throwIfNotOk`. `frontend/src/lib/
helpers/apiError.ts` exposes `isRateLimitError` / `rateLimitRetryAfter` / `rateLimitMessage`;
list pages render `RateLimitEmptyState`, search dropdowns pass `rateLimitMessage` as their
`errorMessage`. Note `details.retryAfter` is a **string** (the backend forwards the `Retry-After`
header verbatim) and can be absent — the helper coerces and falls back to a vague delay. P2/P3
reads deferred.

Established 2026-06-17 — commits `120f06f3` (rate-limit ceiling 100→1000), `0b2f396c` (blog
degradation), `dc24466d` (read-queryFn sweep, all domains).

### Open items (frontend errors)

| Item | Status | Pointer |
|---|---|---|
| **Loader resilience** — triage the `ensureQueryData` loaders; move secondary/degradable fetches to `prefetchQuery`/`.catch` so one failed call can't kill the page. | audited + P1 done 2026-06-17: 3 secondary fetches migrated (`admin/reports` + `admin/users_.$userId` `users()` → `prefetchQuery`, `products/` dermo → `.catch`). Discussions twins **kept** — `useSuspenseQuery` can't degrade via a loader `.catch` (re-throws at render), and their `errorComponent` is already outlet-scoped. | § Loaders above · `loader-resilience.spec.ts` |
| **Surface specific read codes** — the `http_error` collapse hides codes like `rate_limit_exceeded` + `retry-after`; route the relevant reads through `throwIfNotOk` to show "retry in Ns". | P1 wired 2026-06-17 (6 search/list reads). P2/P3 deferred. | § Known gap above · `read-code-surfacing.spec.ts` |
| **Demo logout** — user report "can't log out in demo mode", not reproduced. | needs user clarification | `bugs.md` |

---

## Security — what's safe to surface (applies to every error, not just auth)

The set of error codes a route emits **is a security boundary**. The HTTP response is public
(DevTools, `curl`, proxy): filtering an error on the frontend hides nothing — it already crossed
the wire. So **the backend decides the public code; sensitive distinctions are collapsed
server-side**, and the real reason stays in logs.

Decide per code — is it an oracle?

- **Existence / ownership oracle** (does this email/user/resource exist? is it mine?) → collapse
  to a generic code, **equalize timing**, never let the branch be distinguishable (code, status,
  *or* latency). The asymmetry is the leak, not the message string — and a session-vs-no-session
  or fast-vs-slow difference leaks just as much as a distinct code.
- **Not an oracle** (validation 400, not-found on a public resource, generic 500, rate-limit 429)
  → safe; surface the code.

Rule of thumb: if knowing *which* error occurred tells an unauthenticated attacker something
about another user's account or data, collapse it. Otherwise show it.

**Worked instances**
- **Login** — `invalid_credentials` for unknown-email, wrong-password, *and* locked-account;
  `DUMMY_HASH` keeps timing uniform. `account_locked` removed as a public code (commit `dd9130d0`).
- **Signup** — identical neutral `ok({ pending: true })` either way, no session, timing equalized
  (dummy hash on the existing-email branch), truth delivered by email (`sendAlreadyRegisteredEmail`).
  Implemented 2026-06-17, [ADR 0009](../adr/0009-signup-enumeration-safe.md). `email_exists` removed
  from the contract; `/auth/signup` + `/auth/mobile/signup` return 200, no cookie; frontend lands on
  verify-pending. The 24 h unverified-login grace was kept (back-compat), so login was left untouched.
- **Discussions delete (thread + reply)** — was `403 unauthorized_access` (owned by another)
  vs `404 not_found` (missing) = existence oracle, and those tables have no RLS. Collapsed by
  moving the owner check into the DELETE `WHERE id AND author_id` → uniform `..._not_found`; the
  dead `unauthorized_access` code was dropped. Regression test asserts cross-user ≡ missing.
- **Profile username** — a unique-username collision propagated as an unhandled `500 server_error`
  vs `200` = username-existence oracle (leaks even private-profile usernames that the public
  lookup hides). Now a handled `409 username_taken` (`ProfileError`, caught via `isUniqueViolation`
  then rethrown so `withRlsContext` still rolls back). Unique usernames inherently reveal
  taken-ness; usernames are display-public (shown on profiles + discussion authors), so a clean
  409 is the right resolution, not concealment.

**Cross-cutting audit (2026-06-17)** — every user-data surface swept for existence / ownership /
uniqueness oracles; each finding adversarially verified.

- *Clean* (ownership folded into the query `WHERE id AND user_id` → uniform 404):
  collection / user-products / purchases; product-comparisons; reports / suggested-edits /
  catalog-submissions / role-requests (submit-only or self-scoped).
- *Fixed this pass*: discussions delete, profile username (above).
- *Ruled out*: verify-email `invalid_token` vs `token_expired` — only the token holder (2²⁵⁶
  space) reaches the branch, no cross-user gain; product-create slug collision on a hidden row —
  LOW, leaks catalog-item existence not user PII, deferred.
- *Remaining*: forgot/reset-password doesn't exist yet → build it always-neutral from day one.
  (Signup — the one *unauthenticated* leak — was closed 2026-06-17; see the Signup worked instance.)
