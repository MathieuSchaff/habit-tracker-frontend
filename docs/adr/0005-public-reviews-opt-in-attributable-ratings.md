---
status: accepted
date: 2026-05-27
accepted: 2026-05-27
---

# Public reviews may display user-authored, attributable 1-5 ratings, opt-in per review

Aurore's anti-pattern guide forbids scores, grades, and rating numbers (anti-patterns §1, §4, §8). The public reviews surface (#7) honored this by showing only qualitative 3-bucket aggregates (favorable / mitigé / réservé) per axis, never the raw 1-5. This ADR carves a bounded exception: a reviewer may opt to display their own six 1-5 ratings (`tolerance`, `efficacy`, `sensoriality`, `stability`, `mixability`, `valueForMoney`) alongside their public comment, attributable to their pseudonym. The qualitative buckets are removed; the product page now lists individual public reviews, each optionally carrying its author's raw numbers.

## Why

The bucket compromise solved the doctrine constraint but produced a feature that, for real users, showed nothing. The public comment field (`user_product_reviews.comment`) had no UI write path — only the seed wrote it — so every real public review was comment-less, leaving only an anonymous bucket summary nobody had authored intentionally. The shipped surface was effectively empty in production.

The product owner's intent for "sharing a review" is concrete: a user keeps a private scratchpad (`user_products.comment`, which may hold anything), and separately authors a deliberate, public comment. On publishing, they may also choose to reveal their own per-criterion ratings. The numbers are theirs, about their own experience, shared by explicit choice.

This is categorically different from what §1/§4/§8 forbid. Those anti-patterns target **Aurore-authored** authority: a system-computed product score, a compatibility percentage, a comparison leaderboard — numbers that imply Aurore knows more than it does and that flatten user context into a verdict. A user self-disclosing their own 1-5 is the opposite: it is exactly the user-owned experience the doctrine elsewhere asks us to respect (§20). Aurore computes nothing, ranks nothing, averages nothing. Each visible number is labelled as one person's experience, opt-in, and never folded into a product-level verdict.

Dropping the buckets reinforces the boundary rather than weakening it: with no aggregate on screen, there is no Aurore-computed number anywhere. The only numbers shown are signed by their authors.

## Considered options

- **A. Keep buckets only, never show raw 1-5 — i.e. the #7 status quo plus the consent-gap doc's "option 1" (strip raw ratings from the payload too).** Rejected. It is the most doctrine-pure, but it discards the product owner's actual requirement (let users share their numbers) and leaves the comment-less-review bug unaddressed. Aggregate-only also leaks at N=1: a single public review's bucket ("1 favorable") plus its signed verbatim already reconstructs that person's rating, so "no raw 1-5" was never fully true.
- **B. Always display every reviewer's raw 1-5, no opt-in.** Rejected. Turns the product page into an unconsented rating board for everyone who ever rated — the strongest doctrine violation, and a consent problem (the toggle never promised it).
- **C. Per-review opt-in (`ratings_public`): raw numbers shown only when the author chose to, buckets removed, payload gated on the flag.** **Chosen.** Consent is explicit and per-author; the data shipped equals the data shown equals the data consented; Aurore authors no number.

## Consequences

- New column `user_product_reviews.ratings_public` (boolean, default `false`). Existing public reviews keep their numbers hidden until the author opts in — safe default, no backfill.
- The public payload ships the six rating fields **only** when `ratings_public = true` for that row; otherwise they are `null`. This closes the original consent gap (`public-reviews-consent-gap.md`) at the data layer, not just the display layer: raw numbers are no longer readable via devtools/curl for reviews that did not opt in.
- The qualitative aggregate (`aggregates.byAxis`, `reviewAxisAggregateSchema`, `publicReviewAggregatesSchema`) is removed from the response schema, the service, and the UI. The response becomes `{ reviews }`.
- A public review now requires a non-empty public comment (numbers cannot be shared without authored text), so a "ratings-only" review cannot exist. Every public row stays anchored to a human sentence, not a bare score.
- Residual tension, accepted: a list of many signed 1-5 ratings reads, to the eye, like a rating board even though Aurore averages nothing. The mitigations are structural — opt-in keeps the numbers sparse, no product-level number is ever computed, no cross-product ranking exists, and the framing copy ("expériences personnelles, pas un verdict") stays. If the surface ever starts to feel like a leaderboard, revisit before adding any aggregate or sort-by-rating affordance — those would cross back over the §1/§8 line this ADR deliberately stays behind.
- anti-patterns §1 gains a scoped exception note pointing here.

## Implementation notes (locked 2026-05-27)

- `ratings_public` carries a CHECK `(ratings_public = false OR is_public = true)` — "ratings public on a private review" is unrepresentable at the DB layer. Legacy rows (default `false`) satisfy it, so the constraint ships without a backfill.
- "Public comment required" is enforced **app-side only** (service rejects `is_public = true` when the resulting comment is empty, plus a UI guard), deliberately **not** a DB CHECK. A comment CHECK would reject existing comment-less public reviews and force the very backfill we chose to skip; app-layer enforcement keeps legacy rows valid-but-unlisted.
- Comment length aligned to `max(1000)` on both fields. `user_products.comment` (private) was already 1000; `user_product_reviews.comment` (public) drops from 5000 — the 5000 was an unjustified outlier, and 1000 (~a paragraph) keeps the public verbatim calm.
- Seed (`seed-test-users.ts`) sets `ratings_public = true` on a few personas to exercise the raw-numbers display path.
