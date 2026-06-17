---
status: accepted
date: 2026-06-17
accepted: 2026-06-17
---

# Forgot-password is enumeration-safe — neutral request, reset only by email

`POST /auth/forgot-password` returns an **identical neutral response** whether the email exists or not, **never establishes a session**, and **equalizes timing** across both branches. The new-vs-existing truth is conveyed only by a reset link mailed to the address owner. This closes account enumeration on the last remaining auth surface, completing the doctrine started by login and signup (ADR 0009).

> **Implemented 2026-06-17.** Greenfield: forgot/reset-password did not exist before. `requestPasswordReset()` returns the neutral `ok({ pending: true })` in both branches with a timing-equalizing dummy token hash on the unknown-email path and a fire-and-forget reset mail (so neither branch awaits the send); `resetPassword()` consumes a single-use token, rotates the password, and — atomically — revokes every refresh token, marks the email verified, and clears any brute-force lockout. New table `password_resets` (outside RLS, mirroring `email_verifications`), new routes `/auth/forgot-password` + `/auth/reset-password`, new pages, ADR. Token crypto factored into `token.utils.ts` shared with email-verification.

## Why

Login (`DUMMY_HASH`) and signup (ADR 0009) are already enumeration-safe. Forgot-password is the same shape of leak: a "we sent you a reset link" vs "no account found" divergence — in body, status, *or latency* — lets an unauthenticated attacker enumerate the userbase. Aurore holds skincare / routine / personal data; enumerating its users is a real privacy harm, and the posture must match what the other two endpoints already enforce.

The leak is the **asymmetry, not the message**. So the request endpoint must collapse to one neutral response with no session and equal timing; the truth leaves only by email.

A reset link, unlike a signup, also grants **account takeover** to whoever holds the token. That raises two extra questions this ADR answers: how long the token lives, and what a successful reset does to existing sessions and to the account's verified/locked state.

## Considered options

- **A. Genericize the message only** (keep a distinct success-vs-failure or fast-vs-slow path) — rejected: same defect as ADR 0009 option A. Any observable asymmetry stays enumerable.
- **B. Neutral request, but await the mail send on the existing branch** — simpler, but awaiting a Brevo round-trip on the real branch makes it slower than the dummy branch → a latency oracle. Rejected. (Note: signup's new-email branch *does* await its verification mail; here we improve on that by firing the reset mail fire-and-forget so both branches return in the same time.)
- **C. Strict neutral request + email-delivered reset link, with a hardened reset confirmation** — **Chosen.** Identical response, no session, timing equalized at the crypto level, mail fire-and-forget; the reset confirmation is single-use, short-lived, and rotates credentials.

## Consequences

**Neutral contract (the request)**
- `requestPasswordReset()` returns `ok({ pending: true })` in **both** branches; no `email_not_found` / `user_exists` ever reaches the client.
- **Timing equalization:** the unknown-email branch runs `hashToken(generateRawToken())` (discarded) so it spends the same token crypto as the real branch. Unlike login/signup there is **no dominant password hash** on this path (the token hash is sha256, ~microseconds), so the residual delta is the real branch's DB transaction (~ms), not a small fraction of a large equalized cost. That delta sits below real-world network jitter and is further blunted by the 5/15 min per-IP limiter; it is an accepted gap (see Risks), not a masked one.
- **OAuth-only accounts:** if the email belongs to a Google-only account (no password set), the request returns the same neutral `ok({ pending: true })` **without minting a token or sending mail**. A reset must not silently graft password-auth onto an account the user created as OAuth-only (mirrors `changePassword`'s `!passwordHash` guard); neutrality is preserved so nothing leaks.
- The reset mail is sent **fire-and-forget** (`void`), so response latency is independent of whether a mail is actually dispatched.

**Reset confirmation (deliberately NOT neutral)**
- `POST /auth/reset-password` returns distinct `invalid_token` vs `token_expired` (both HTTP 400, mirroring `/verify-email`). This is a **token-holder-only path on a 2²⁵⁶ space**: distinguishing the two leaks nothing about any other account, and the UX win (telling the user to request a fresh link) is real. The always-neutral rule binds the *request*, not the confirmation.
- A successful reset is treated as **proof of inbox control**, so it:
  - marks the email verified if it wasn't (`coalesce(email_verified_at, now())`) — this also means a reset cannot be used to bypass email verification, it *is* a verification;
  - clears `failed_login_attempts` / `locked_until` (the owner has regained access);
  - revokes **all** refresh tokens (credential rotation; mirror of `changePassword`).
  These three writes + the password rotation + token consumption happen in one transaction: a partial reset must never leave stale sessions alive.
- **Token:** 32 random bytes, only its sha256 hash stored, single-use (`used_at`), previous outstanding tokens invalidated on each new request (a partial unique index on `(user_id) where used_at is null` also blocks two concurrent requests from leaving two live tokens). **Expiry 1 h**, mirroring email-verification — one constant, consistent "le lien expire dans 1 heure" wording. (A shorter window is defensible for a takeover token; 1 h was chosen for consistency and accepted.)
- **Cost ordering:** `resetPassword` validates the token (cheap indexed lookup) **before** computing the argon2 hash of the new password, so an invalid/expired/used token costs no hash. `/reset-password` has no failure-counting limiter (the blanket browse limiter skips 4xx), so hashing first would let an unauthenticated caller burn argon2 CPU at will. The tx then re-checks the token under `FOR UPDATE` (single-use, TOCTOU-safe).

**Storage / RLS**
- New `password_resets` table lives **outside RLS**, like `email_verifications`: forgot/reset are pre-identity lookups (by email, then by token hash) with no session to bind an RLS context to. No SECURITY DEFINER function needed.

**Rate-limit**
- Dedicated per-IP limiter on `/auth/forgot-password` (own bucket, counts every request, 5 / 15 min): it is a mail-spam surface, so unlike the global browse limiter it throttles aggressively. (Per-target-email throttling across rotating IPs is **not** implemented — noted as a future hardening; the IP limiter + fire-and-forget + neutral response are the first line.)

**Mobile**
- No mobile-specific routes. The neutral request returns no token and the reset link is an inherently web URL (`/auth/reset-password?token=…`); the existing web endpoints serve mobile clients unchanged. (Contrast signup/login, which need `/mobile/*` only to return tokens in the body.)

**Frontend**
- `ForgotPasswordPage` (email → identical confirmation screen regardless of existence) and `ResetPasswordPage` (token from URL → new password + confirm). A "Mot de passe oublié ?" link is added to the login page.

**Risks / negatives**
- Email deliverability is load-bearing for recovery (same tradeoff as ADR 0009).
- Residual sub-jitter timing delta and the absence of per-email throttling are accepted, documented hardening gaps, not open leaks.
- A token-creation DB failure on the existing-email branch is swallowed (best-effort): the user sees the neutral pending screen but no mail is sent. Re-surfacing it as `server_error` would add a server-state oracle (observable only on the existing branch), so the degradation is accepted — in practice such a failure means the DB is down for every endpoint anyway.

## Out of scope

- Per-target-email rate-limiting across rotating IPs.
- Distinct UX for "this reset link was superseded by a newer one" (it collapses to `invalid_token`).
