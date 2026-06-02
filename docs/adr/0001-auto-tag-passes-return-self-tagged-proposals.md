---
status: accepted
date: 2026-05-18
accepted: 2026-05-19
---

# Auto-tag passes return self-tagged proposals

The auto-tagging orchestrator (`backend/src/features/auto-tagging/orchestrator.ts`) runs ~30 detector functions on each product and dedups their output. Today most detectors return `SkincareProductTagSlug[]` and the orchestrator wraps each result with hardcoded `(relevance, source)` tuples (e.g. `for (const s of formulaSlugs) propose(s, 'secondary', 'formula')`). We will change passes to return `AutoTagProposal[]` — each proposal already carries its own `relevance`, `source`, and (for algo-derm) `confidence` — so the orchestrator no longer has to know what each detector is.

## Why

The current shape is a leaky seam. The orchestrator carries 21 hardcoded `'formula'` literals plus per-pass relevance defaults, which means adding or relabelling a pass means editing the orchestrator. Passes also coordinate via shared mutable state (`seenSlugs`) that only one post-pass actually reads, and the pass-1 algo-derm `topConcernConfidence` value is tracked inside the orchestrator's pass-1 loop instead of travelling with the proposal it belongs to.

Pulling metadata onto the proposal makes each pass self-describing: the test surface becomes `Pass.run(ctx, prior) → AutoTagProposal[]`, and the orchestrator collapses to "hoist context → reduce passes → post-promote". Peau-normale stops being a special post-pass — it just reads `prior`.

## Considered options

- **A. Keep slug-emitting detectors, orchestrator owns `(relevance, source)`.** Detectors stay terse, but the orchestrator keeps 21 `'secondary'/'formula'` call sites and cannot be reduced to a uniform pass loop. The leakiness we set out to fix stays.
- **B. Each pass returns `AutoTagProposal[]` with self-declared metadata.** **Chosen.** Uniform pass interface enables `passes.reduce(...)`; source/relevance ownership lives with the pass that knows them.
- **B2. Split `source: 'formula'` into finer sub-sources** (`formula-texture`, `formula-occlusif`, ...). Rejected — `AutoTagSource` is persisted downstream (`backfill/main.ts:361` stats record, `audit/orchestrator-diff.ts` CSV column 5). Renaming is a contract migration that does not belong in an ownership refactor.

## Consequences

- `AutoTagProposal` gains an optional `confidence?: number` field, populated only by the algo-derm pass. Primary-promotion reads it back from `prior` instead of tracking it as an orchestrator-local variable. Other ML-flavoured passes can use the same channel later.
- Cross-pass dataflow (`actifSlugs` consumed by cross-signal + avoid; `seenSlugs` consumed by peau-normale) flows through the `prior: readonly AutoTagProposal[]` argument, accessed via `priorSlugsBySource(prior, 'actif-class')` / `priorSlugSet(prior)`. No mutable shared state between passes.
- Pass ordering becomes the array order of `AUTO_TAG_PASSES`. The "post-pass" concept disappears for peau-normale; only primary-promotion (which *mutates* existing proposals) remains orchestrator-side.
- `AutoTagSource` enum stays frozen — no downstream consumer (backfill stats, audit CSV, parity test) changes.
- Migration is mechanical and reversible per-pass: each detector keeps its internal body; only the export wrapper changes. The parity test (`tests/auto-tag-orchestrator-parity.test.ts`) is the safety net during conversion.
