---
status: accepted
date: 2026-06-17
accepted: 2026-06-17
---

# Signup is enumeration-safe — neutral response, truth only by email

Signup returns an **identical neutral response** whether the email is new or already registered, **never establishes a session**, and **equalizes timing** across both branches. The new-vs-existing truth is conveyed only by an email to the address owner. This closes account enumeration on the registration endpoint.

> **Implemented 2026-06-17.** `signup()` now returns the neutral `ok({ pending: true })` in both branches with a timing-equalizing dummy hash on the existing-email path; `/auth/signup` + `/auth/mobile/signup` return 200 with no session/cookie; `SignupErrorCode`/`SignupResult` updated and `email_exists` removed from the contract; the frontend lands on the verify-pending screen and verifying redirects to login when there is no session; `sendAlreadyRegisteredEmail` notifies the owner. **One deviation from the spec below:** the 24 h unverified-login grace was *kept* (back-compat for pre-existing accounts), not dropped — login/refresh were intentionally left untouched. Login-side hardening (`account_locked` → `invalid_credentials` + owner notification) shipped separately.

## Why

Login is already enumeration-safe: a single generic `invalid_credentials` for unknown-email and wrong-password, plus a `DUMMY_HASH` so the unknown-email path takes the same time as the wrong-password path (`backend/src/features/auth/service.ts`). Signup was the remaining leak.

The leak is the **asymmetry, not the message**. Any observable difference between the new-email and existing-email branches lets an attacker distinguish them:
- error vs success,
- session vs no session,
- fast vs slow response.

So `email_exists` → a generic message is *not* enough: an attacker still sees "account created + logged in" (new) vs "neutral / no session" (existing). Closing the leak requires **all** of: identical HTTP body+status, no session in either branch, equalized timing.

Aurore holds skincare / routine / personal data. Not a bank, but enumerating its userbase is a real privacy harm — and the posture must match what login already enforces.

## Considered options

- **A. Keep current flow (auto-login + 24h verify grace), only genericize the message** — minimal change. Rejected: leaves the success-vs-error and session-vs-no-session asymmetry → still fully enumerable. Cosmetic.
- **B. Accept residual signup enumeration, bound it with a hard rate-limit (+ captcha)** — pragmatic, keeps signup auto-login UX. Rejected for Aurore's data sensitivity: a rate-limit slows enumeration, it does not close it.
- **C. Strict neutral signup** — **Chosen.** Identical response, no auto-login, timing equalized, truth delivered by email. Closes the leak; cost = signup UX shifts to email-link double opt-in.

## Consequences

**Flow change**
- Signup no longer returns tokens / auto-logs-in. New flow: submit → *"Si un compte peut être créé avec cette adresse, tu recevras un email."* → the user acts on the email:
  - email **new** → verification/activation link → on click: verified + session established (or land on login).
  - email **existing** → *"tu as déjà un compte, connecte-toi / réinitialise ton mot de passe"*. No account created, no session.
- This is **hard double opt-in**, replacing the current soft opt-in (instant login + 24 h grace, `login()` in `service.ts`). Aligns with the data sensitivity.

**Backend**
- `signup()` returns a neutral `ok()` (no `user`, no tokens) in **both** branches; `email_exists` is never sent to the client.
- **Timing equalization (non-negotiable):** the existing-email branch must run a dummy `Bun.password.hash` (mirror login's `DUMMY_HASH`) so it costs ~the same as the create branch (which hashes). Without it, fast-vs-slow re-leaks existence — the exact mistake login already avoids.
- Two best-effort emails, off the response path: verification (new) and a new `sendAlreadyRegisteredEmail` (existing).
- Revisit the 24 h unverified-login grace (`login()` in `service.ts`): with hard opt-in, accounts verify before first login. Keep the grace only for back-compat with accounts created before this change, or drop it.

**Contract (`shared/src/auth`)**
- `SignupErrorCode` drops `email_exists` (→ `'server_error'` only; field validation still 400 via `zValidator`).
- `SignupResult` becomes `ApiResponse<{ pending: true }, 'server_error'>` (no `AuthenticatedResult`). Ripples to `/auth/signup`, `/auth/mobile/signup`, and `useSignup`.

**Frontend**
- `useSignup.onSuccess` no longer `setAuth`; the page shows the neutral message + a "check your email" screen. No navigation to `/collection`.
- Add a test asserting **both branches return byte-identical responses** — that test is the enumeration guard.

**Risks / negatives**
- More signup friction (must open the email to proceed). Accepted tradeoff.
- Email deliverability becomes load-bearing for onboarding; mitigate with a resend flow + clear messaging.
- `/auth/mobile/signup` loses immediate-token behavior → the mobile client must handle the email-link flow too.

**Out of scope**
- Forgot/reset-password does not exist yet. When built, apply the same always-neutral rule. Tracked separately.
