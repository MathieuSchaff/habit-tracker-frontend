# Architecture Decision Records

Canonical ADRs for Aurore. This directory is tracked in git.

## Index

| # | Title | Status | Date |
|---|-------|--------|------|
| [0001](./0001-auto-tag-passes-return-self-tagged-proposals.md) | Auto-tag passes return self-tagged proposals | accepted | 2026-05-19 |
| [0003](./0003-backup-encryption-asymmetric-gpg.md) | Backup encryption — asymmetric GPG | accepted | 2026-05-19 |
| [0004](./0004-formula-passes-re-emit-algo-derm-slugs.md) | Formula passes re-emit algo-derm slugs | accepted | 2026-05-24 |
| [0005](./0005-public-reviews-opt-in-attributable-ratings.md) | Public reviews — opt-in, attributable ratings | accepted | 2026-05-27 |
| [0006](./0006-contributor-gains-content-moderation.md) | Contributor gains content moderation | accepted | 2026-05-30 |
| [0007](./0007-error-handling-strategy.md) | Hybrid error handling strategy | accepted | 2026-06-02 |
| [0008](./0008-role-demotion-enforced-fresh-at-gates.md) | Role demotion enforced fresh at gates | accepted | 2026-06-02 |
| [0009](./0009-signup-enumeration-safe.md) | Signup is enumeration-safe — neutral response, truth only by email | accepted | 2026-06-17 |
| [0010](./0010-forgot-password-enumeration-safe.md) | Forgot-password is enumeration-safe — neutral request, reset only by email | accepted | 2026-06-17 |
| [0011](./0011-home-is-dual-audience.md) | Home (`/`) is dual-audience — never redirect authenticated users away | accepted | 2026-06-25 |
| [0012](./0012-discoverability-opt-in-decoupled.md) | Profile discoverability is opt-in matching consent, decoupled from display | accepted | 2026-06-25 |
| [0013](./0013-reactions-signed-counterless.md) | Reactions are signed and counter-less — a list of who, never a tally | accepted | 2026-06-25 |
| [0014](./0014-role-at-dose-narrow-name-gate-override.md) | roleAtDose is a narrow name-gate override for cap-marginal AHA | accepted | 2026-07-02 |
| [0015](./0015-db-snapshots-plain-git-no-lfs.md) | DB snapshots are plain-text git blobs, not LFS | accepted | 2026-07-22 |

Next available: **0016**. Name: `NNNN-short-imperative-verb-phrase.md`.

## Template

```markdown
---
status: accepted | draft | superseded-by-XXXX
date: YYYY-MM-DD
accepted: YYYY-MM-DD
---

# Short imperative title

One paragraph: what the decision is and its scope.

## Why

Context that made this decision non-trivial. Trade-offs that mattered.

## Considered options

- **A. Option name** — description. Rejected: reason.
- **B. Option name** — **Chosen.** Reason.

## Consequences

What changes. Positive and negative effects. Follow-on decisions.
```

## When to write an ADR

Write when:
- Decision is cross-cutting (multiple packages or features)
- It changes an existing convention held by real code
- A future contributor would independently question the choice

Skip for: local implementation choices, routine CRUD, cosmetic decisions, single-file concerns.
