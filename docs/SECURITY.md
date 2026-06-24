# Security

This document explains how Aurore protects user accounts and user data.

The main idea is simple:

- users should only access their own data;
- passwords and sessions should be handled safely;
- the API should reject bad or unexpected input;
- production should not expose internal errors or secrets.

---

## Authentication

Aurore uses access tokens and refresh tokens.

- Access tokens are short-lived: 15 minutes.
- They are stored in memory on the frontend.
- Refresh tokens last 7 days.
- Refresh tokens are stored in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie.
- Refresh tokens are rotated when they are used.
- Logout revokes the current refresh token.
- Password change or reset revokes all active sessions.

Passwords are hashed with Argon2 using Bun’s native password API.

Login, signup and forgot-password responses are designed to avoid revealing whether an email already exists.

---

## User data protection

User data is protected at two levels.

First, the backend uses the authenticated user from the verified token.
The client does not choose its own `userId` for sensitive actions.

Second, PostgreSQL Row-Level Security is enabled on user-owned tables.

This means that even if a backend query forgets a `userId` filter, PostgreSQL still blocks access to another user's rows.

The backend connects to the database with a restricted runtime role.
The owner role is only used for migrations and admin tasks.

---

## API security

All incoming data is validated with Zod:

- JSON bodies;
- query parameters;
- URL parameters.

CORS only allows the trusted frontend URL.

In production, API errors are cleaned before they are sent to the client.
Stack traces and internal error messages are logged server-side, but not exposed in responses.

The API also has rate limits:

- general API limits;
- stricter limits for login;
- stricter limits for forgot-password.

This helps reduce brute-force attempts and spam.

---

## Browser security

In production, nginx sends security headers such as:

- Content Security Policy;
- HSTS;
- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`;
- `Referrer-Policy`.

Fonts are self-hosted with `@fontsource`, so the browser does not need to contact Google Fonts.

Image uploads are size-limited in the backend and at the nginx level.

---

## Infrastructure

Production secrets are not committed.

`.env.prod` is ignored by Git.

Container images are pinned by digest, so production does not depend on moving image tags.

Database changes go through explicit SQL migrations.

The app also checks production environment variables at startup and refuses known weak or leaked development credentials.

---

## Tests

Security-sensitive auth flows are covered by integration tests:

- login;
- refresh;
- logout;
- password change;
- forgot password;
- reset password;
- invalid input handling;
- email enumeration protection.
