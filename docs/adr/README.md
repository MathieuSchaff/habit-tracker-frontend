# Architecture Decision Records

Canonical ADRs for Aurore. This directory is tracked in git.

## Index

| # | Title | Status | Date |
|---|-------|--------|------|
| [0001](./0001-auto-tag-passes-return-self-tagged-proposals.md) | Auto-tag passes return self-tagged proposals | accepted | 2026-05-19 |
| [0002](./0002-autotag-skip-events-ride-trackerror.md) | Autotag skip events ride trackError | accepted | 2026-05-19 |
| [0003](./0003-backup-encryption-asymmetric-gpg.md) | Backup encryption — asymmetric GPG | accepted | 2026-05-19 |
| [0004](./0004-formula-passes-re-emit-algo-derm-slugs.md) | Formula passes re-emit algo-derm slugs | accepted | 2026-05-24 |
| [0005](./0005-public-reviews-opt-in-attributable-ratings.md) | Public reviews — opt-in, attributable ratings | accepted | 2026-05-27 |
| [0006](./0006-contributor-gains-content-moderation.md) | Contributor gains content moderation | accepted | 2026-05-30 |
| [0007](./0007-error-handling-strategy.md) | Hybrid error handling strategy | accepted | 2026-06-02 |
| [0008](./0008-role-demotion-enforced-fresh-at-gates.md) | Role demotion enforced fresh at gates | accepted | 2026-06-02 |

Next available: **0009**. Name: `NNNN-short-imperative-verb-phrase.md`.

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
