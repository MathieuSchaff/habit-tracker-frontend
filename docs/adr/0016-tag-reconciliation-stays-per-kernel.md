---
status: accepted
date: 2026-07-23
accepted: 2026-07-23
---

# Tag reconciliation stays per-kernel; no shared policy module

Four code paths decide what happens when an emitted auto-tag pair meets an existing `product_tag_links` row: intake (`auto-tagging/write.ts`, SQL DELETE-non-manual + INSERT `onConflictDoNothing`), backfill (`runners/backfill/classify.ts`, pure additive-only), the reconcile dry-run (`runners/backfill/reconcile-diff.ts`, pure full-sync prediction), and the seed (`db/seed/seeders/merge-product-tag-pairs.ts`, pure stream merge). An architecture review (2026-07-23) proposed concentrating them behind one pure "tag reconciliation policy" module (`want × stored × manual → actions`, modes `additive | full-sync`). We reject that module and instead lock the one real gap with a cross-pinning test: `tests/reconcile-parity.test.ts` proves `diffReconcileProduct` predicts exactly what `writeTagsForProduct` persists.

## Why

- **The four paths are two policies, each in its optimal encoding.** Additive (backfill) and full-sync (intake; reconcile WRITE applies the intake primitive) are genuinely different behaviours, not copies. The seed has no `stored` side at all (fresh DB) — its merge is a different decision, own module since 2026-07-23.
- **The SQL encoding is load-bearing, not accidental.** `write.ts` never reads the stored rows: the scoped DELETE plus `onConflictDoNothing` make Postgres enforce manual-safety atomically, with no read-modify-write window. A pure partition would need a SELECT before deciding (one more serial read inside the intake tx — Bun single-conn pipelining forbids parallelising it) and would still need `onConflictDoNothing` against concurrent manual inserts. The "pure decision" would layer on top of the SQL guarantees, not replace them.
- **The deletion test comes up short.** The module would replace ~120 lines of small, tested, single-caller functions with a comparable amount of module + three adapters + race compensation, churning the critical intake path for a modest concentration gain.
- **The manual-safety invariant is already singular where it matters.** It is a named domain concept (`CONTEXT.md` § Manual tag), and each encoding is pinned by its own test (`backfill-classify.test.ts`, `auto-tag-manual-overlap.test.ts`, `merge-product-tag-pairs.test.ts`, and now the parity test).

## Considered options

- **A. Shared pure policy module, adapters everywhere.** Rejected — costs above; the dry-run/apply fidelity it would buy is delivered by the parity test at zero production churn.
- **B. Status quo with a cross-pinning parity test.** **Chosen.** The only unguarded failure mode was `reconcile-diff.ts` silently drifting from `write.ts` (they share vocabulary but no code). The parity test builds a disordered stored state (stale row, missing row, flipped relevance, manual-held PK), asserts the prediction, applies `writeTagsForProduct`, and asserts the persisted state matches the prediction.

## Consequences

- Future architecture reviews should not re-propose the shared policy module while the premises hold. Reopen if a **third real policy** appears (not a new caller of an existing one), or if dry-run↔apply drift ships despite the parity test.
- Any change to `write.ts` DELETE/INSERT semantics or to `diffReconcileProduct` must keep `tests/reconcile-parity.test.ts` green; that file is the shared contract.
- `classify.ts` (additive) is deliberately outside the parity test's scope — it predicts a different writer (`backfill/main.ts` upserts), already pinned by its own unit tests.
