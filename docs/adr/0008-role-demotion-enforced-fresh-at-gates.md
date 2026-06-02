---
status: accepted
date: 2026-06-02
accepted: 2026-06-02
---

# Role demotion is enforced by a fresh DB read at the privileged gates, not via the JWT claim or RLS

Roles ride in the access-token JWT claim (15 min TTL). `requireJwtAuth` sets `userRole` from that claim, and the two privileged gates — `requireCatalogWrite` (catalogue curation) and `requireContentModerator` (content moderation, [ADR-0006](0006-contributor-gains-content-moderation.md)) — read it. So a `contributor` demoted to `user` (the #16b admin demotion) kept catalogue and moderation powers until the next `/auth/refresh` re-sourced the role — a bounded, self-healing window of up to ~15 min. This ADR closes that window by re-sourcing the role from the DB **inside the two gates**, and records why the obvious "fix it in RLS" alternatives were rejected.

## Why

- **The claim is stale and both authorization branches trust it.** The app branch (gates) reads `c.get('userRole')` = claim. The DB branch is no safer: `withRlsContext` sets `app.role` from the **same** claim, and `auth.role()` reads `app.role`, so every RLS policy carries the identical 15 min staleness. RLS is not an independent defence here — it is the same hole a second time.
- **The ban path, by contrast, is genuinely fresh.** `requireNotBanned` → `isUserBanned(userId)` reads `user_bans` by user id (30 s cache), independent of `app.role`. So active abuse is already cuttable instantly via a ban; demotion staleness only bites the benign "this person no longer needs the role" case — where every reachable power is reversible and content-scoped (irreversible/account acts stay behind `requireAdmin`, which an ex-contributor never satisfies).
- **The blast radius is exactly two gates.** A stale `contributor` claim passes `requireCatalogWrite` (create/edit sheets, link, tag) and `requireContentModerator` (view hidden, hide/restore, report queue, suggested-edits) — never `requireAdmin`. Closing those two gates closes the radius.

## Decision

The two gates call `getUserRole(db, userId)` and authorize on the **current DB role**, not the claim. A demoted user is `403`'d on the next privileged request, no wait for refresh. `auth.role()`, `app.role`, and every RLS policy are left untouched.

## Considered options

**A — Accept + document.** Defensible: window ≤ 15 min, powers reversible/content-scoped, ban covers active abuse. Rejected only because the gate-level fix is cheap; not wrong in principle.

**B1 — Redefine `auth.role()` to read the DB.** Elegant: one place, every table fresh at once. **Rejected (perf).** `auth.role()` is evaluated *inside policies* → ~once per statement on every role-gated table (nearly all, via `_admin_bypass`). A normal `user` reading their own collection would pay a PK-lookup per query, **even on SELECT**. It taxes 100 % of traffic — reads included — to protect a rare demotion, inverting the original design (role in `app.role` = a free memory read).

**B2 — Source the fresh role once per request in `withRlsContext`.** Bounded to one lookup/request (not per statement), closes RLS + gates together. **Rejected (still too broad).** It runs on every authenticated request including browse/SELECT; it taxes reads for a problem that only exists on privileged writes.

**B3 — Fresh read at the gates only.** **Chosen.** The lookup falls only on privileged routes (rare); public browse (`optionalJwtAuth`) and normal users pay nothing; cost scales with privileged actions, not traffic. The gate `403`s before the DB, so RLS staleness is moot on these routes (it remains a no-worse-than-before backstop elsewhere).

**Direct lookup vs 30 s cache (mirroring the ban cache).** **Direct.** The ban cache is justified by *frequency*: `requireNotBanned` fires on nearly every authenticated request. The gate role-check fires on privileged routes only — the frequency that earns a cache is absent. A cache would copy the ban's *form* while missing its *driver*, and add a ≤ 30 s staleness window that contradicts "immediate" unless wired with invalidation. The closest internal precedent is `requireNotBannedScope` (rare, write-path, **uncached**) — not the broad `requireNotBanned`.

## Consequences

- **Demotion is immediate on the privileged routes.** No token revocation, no `tokenVersion` column, no schema change, no migration.
- **RLS is untouched**, so every RLS test that fakes a role via `app.role` stays green — far less blast than B1/B2 would have caused.
- **`requireAdmin` is not patched**: an ex-contributor never holds the admin claim, and no flow demotes an admin.
- **Freshness placement now follows one rule**: broad/frequent identity checks (global ban) are cached; rare privileged-action checks (scope ban, role gates) read direct. Future gates should follow the same split.
- **Residual, accepted**: any *other* role-dependent path that relies solely on the claim/RLS still carries the ≤ 15 min window — but those are reads, not the gated privileged writes; the catalogue-write + content-moderation radius is fully closed.
- Covered by `backend/src/features/auth/tests/role-demotion-gate-403.test.ts` (stale `contributor` claim + DB demoted → `403` on both gates).
