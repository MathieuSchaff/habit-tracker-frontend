# Security

---

## Authentication & Authorization

### JWT-Based Authentication
- **Access Tokens**: Short-lived (15 minutes), stored in memory on the frontend, passed via `Authorization` header.
- **Refresh Tokens**: Long-lived (7 days), stored in an **HttpOnly, Secure, SameSite=Lax** cookie. This prevents XSS-based token theft.
- **Token Rotation**: When a refresh token is used, it is revoked and a new one is issued.
- **Revocation**: All tokens for a user can be revoked on password change or manual logout by clearing the `jti` (JWT ID) in the database.

### Password Hashing
**Argon2** via Bun's native `password.hash` API — currently the industry standard for password hashing, resistant to GPU-based brute-force and side-channel attacks.

### Session Security
**Timing Attack Protection**: A dummy hash verification runs during login when a user is not found, keeping response time consistent regardless of whether the email exists.

### Email Verification
Signup issues a single-use token (stored hashed in `email_verifications`) and the account stays unverified until the user confirms via email. Expired or consumed tokens are rejected.

### Google OAuth
OAuth login is delegated to Google (`backend/src/features/auth/google.service.ts`). The callback exchanges the authorization code server-side; no Google tokens are exposed to the browser. A local `accessToken` is issued exactly like for password login.

---

## API Security

### Validation (Zod)
All incoming data (JSON bodies, query parameters, URL parameters) is strictly validated using **Zod** schemas defined in the `shared` package. This prevents malformed data from reaching business logic and mitigates injection risks.

### Rate Limiting
Two layers protect the API in production:
- **Edge (nginx)** — `limit_req` at 10 req/s per IP on all `/api/` routes.
- **Application (`hono-rate-limiter`)** — 100 req / 15 min per IP on auth, admin and write/submission routes; a stricter 10 req / 15 min limiter that counts failed attempts guards login against password spraying, paired with per-user DB lockout. Health and favicon endpoints are skipped. Disabled in development to avoid blocking local iteration.

### CORS
CORS is configured to only allow requests from the trusted `FRONTEND_URL` defined in environment variables.

### Error Handling
A global error handler sanitizes all error responses. In production, internal stack traces and arbitrary error messages — including those from third-party libraries that carry an HTTP status — are never exposed to the client; they are logged server-side and the client receives only a stable error code.

---

## Browser Security

### Content-Security-Policy
The production nginx config sends a strict CSP on every response: `script-src 'self'` (no `'unsafe-inline'`, no `'unsafe-eval'`), `style-src 'self' 'unsafe-inline'`, `font-src 'self'`, `img-src 'self' data:` plus the Bunny image CDN, `connect-src 'self'`, with `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, and `object-src 'none'`. A local regression guard (`just test-csp`) builds the production bundle, serves it with the live CSP, and fails on any violation.

### Self-hosted fonts
Fonts are bundled via `@fontsource` rather than the Google Fonts CDN: no visitor IP is sent to a third party (GDPR), and the CSP needs no external font or style origins.

### Other headers
nginx also sends HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: strict-origin-when-cross-origin`.

### Upload limits
Image uploads are bounded at the application layer (`bodyLimit` 1 MiB; avatars ≤200 KB, product images ≤500 KB) and at the edge (`client_max_body_size 2m`).

---

## Database Security

### Row-Level Security (defense in depth)
Tenant-scoped tables (`tasks`, `profiles`, `user_products`, `purchases`, `user_preferences`, `user_dermo_profiles`, `user_bans`, …) run with `FORCE ROW LEVEL SECURITY`. Policies filter on `auth.uid()` / `auth.role()`, two `SECURITY INVOKER` SQL functions (schema `auth`) that read per-transaction GUCs `app.user_id` and `app.role`.

Each authenticated request is wrapped in a transaction by the `withRlsContext` middleware (`backend/src/features/auth/rls-context.middleware.ts`), which binds those GUCs via `set_config(...)` before handing control to the route. Pre-identity flows (signup, OAuth, demo, email confirmation) call the `bindRlsContext` helper (`backend/src/db/rls.ts`) to set the same context inside their own transaction.

Result: even if application code forgets to filter by `userId`, Postgres itself refuses to return or insert rows for another tenant.

### Privilege Separation (three DB roles)
- **`app`** — owner role used for migrations and administrative tasks. Bypasses RLS. Credentials live only in the migration context.
- **`app_runtime`** — runtime role used by the backend request pool (`APP_DATABASE_URL`). Subject to RLS, cannot bypass policies.
- **`dev_readonly`** — investigation role for prod debugging. `NOLOGIN` (assumed via `SET ROLE` from `app`), `SELECT`-only, no bypass. Reads catalog tables freely; tenant tables (FORCE RLS) return zero rows. To inspect a tenant's data: `SET ROLE app_runtime; SET LOCAL app.user_id = '<uuid>';`. INSERT/UPDATE/DELETE are not granted, so a typo cannot destroy data.

The backend connects with `app_runtime`, so a bug or SQL injection in a route is bounded by the active RLS context rather than having full DB access.

### User Data Isolation
Application code still scopes queries by `userId` extracted from the verified JWT — the client never provides its own userId for sensitive operations. RLS is the last line of defense if that contract slips.

### Migrations
All schema changes go through explicit SQL migration files — auditable, reviewable, and applied deliberately.

---

## Infrastructure & Supply Chain

### Pinned container images
Third-party images (Postgres, nginx, certbot) are pinned by digest, so production runs exactly the tested image rather than a floating tag. nginx is pinned to a release patched against CVE-2026-42945.

### Leaked-credential guard
The environment validator rejects known-weak or previously-committed development passwords in `DATABASE_URL` / `APP_DATABASE_URL` at production boot — failing fast instead of silently running with a compromised credential.

### Secrets
`.env.prod` is never committed (gitignored); secrets are generated with `openssl rand -base64`. The Postgres runtime role password is distinct and aligned at deploy time.

---

## Security Testing

- Auth flows (login, refresh, logout, password change) are covered by integration tests in `backend/src/features/auth/tests`.
- Invalid inputs are tested to verify they're rejected with `400 Bad Request`.

---

## Reporting Vulnerabilities

If you find a security vulnerability, please do not open an issue. Contact the maintainer directly.
