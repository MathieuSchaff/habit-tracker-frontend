---
status: accepted
date: 2026-05-19
accepted: 2026-05-19
---

# AutoTag skip events ride trackError as transport

`createProduct` and the inci-changing branch of `updateProduct` (the **Intake** path) wrap `writeTagsForProduct` in `try/catch → console.warn`. The product persists, the tags silently don't — no metric, no event, no way to know how often or for which products this happens. We will surface the failure as an **AutoTagSkipped** event emitted via the existing `trackError` transport, using a frozen `message` constant (`AUTOTAG_SKIP_EVENT_KIND = 'product_autotag_skipped'`) so the events are filterable from real crashes, and we will hide the wrapping pattern behind a named helper `writeTagsForProductFailSoft`.

## Why

The fail-soft behaviour itself is correct: tags are derived state, the product is the source of truth, and the backfill runner can re-derive. But the failure mode being invisible means we cannot tell whether the backfill is recovering one product per week or one per minute, and we cannot tell which orchestrator path is fragile (bad INCI? missing brand-cert row? DB timeout?).

A dedicated `auto_tag_skip_events` table plus an async worker (option C below) would model the concept faithfully, but adds a schema migration, a worker process, and a new ops dashboard for a problem whose volume we cannot yet estimate. The lean step is to ride `trackError` as transport, keep call sites under a named helper, and migrate later if volume justifies.

## Considered options

- **A. Inline `trackError(...)` at each catch site.** Rejected — the `message`, `context` shape, `stack` extraction, and `userId` propagation would be duplicated between `createProduct` and `updateProduct`, with the usual drift risk. Adds zero abstraction value because the trade-off being preserved ("fail-soft + tracked") is exactly the pattern worth naming.
- **B. Helper `writeTagsForProductFailSoft(database, productId, meta)` that wraps `writeTagsForProduct` in try/catch and emits the event.** **Chosen.** Names the pattern, removes the try/catch from intake services, centralises the contract in one place. Asymmetric on purpose: `writeTagsForProduct` (throwing) still serves the backfill runner, `writeTagsForProductFailSoft` (swallowing + tracked) serves intake. (Update 2026-06-26: seed-core moved to `detectAllAutoTags` directly, so the throwing primitive now serves only the backfill runner.) (Implemented: `recordAutoTagSkip` was later extracted as a separate export handling the `trackError` call, with `writeTagsForProductFailSoft` delegating to it; public contract unchanged.)
- **C. Dedicated `auto_tag_skip_events` table + async worker + `products.auto_tag_status` column.** Rejected for this delivery. Faithfully models the concept but is scope creep before we have data justifying a separate dashboard. Path forward when volume warrants: swap the body of `writeTagsForProductFailSoft` (call sites untouched), backfill historic rows from `errorGroups` filtered on `AUTOTAG_SKIP_EVENT_KIND`, then retire the constant.

## Consequences

- `errorGroups` now contains non-crash entries. Filterable via `message = 'product_autotag_skipped'`, queryable by `userId` (FK on the joined `error_occurrences` row, not `error_groups`) and `productId` (in `context` jsonb). The constant is exported from the helper module so query call sites do not drift.
- The `message` string `'product_autotag_skipped'` is **frozen contract**: `computeFingerprint` keys on it, so renaming re-fingerprints all events and dissociates historic occurrences from new ones. Renaming is acceptable only at the C-migration boundary, when historic data is being moved out of `errorGroups` anyway.
- `err.stack` is passed through so each distinct throw site gets its own fingerprint group (bad INCI, missing brand-cert row, DB timeout become separate groups instead of one mixed bucket). The `:line:col` normalization in `computeFingerprint` keeps groups stable across refactors.
- `operation: 'create' | 'update'` lives in `context`, not in `message` or in the stack-derived fingerprint. Same throw site groups across both operations; the dimension stays filterable in query.
- Helper signature requires `userId`, sourced from the existing `userId` argument of `createProduct` / `updateProduct`. Forensic "which user triggered the skip" stays a single FK join, not a jsonb-path query.
- The asymmetry between the two helpers is documented in `docs-private/02-engineering/CONTEXT.md` and reflected in the auto-tagging README's "Three consumers" + "Failure modes" sections.
