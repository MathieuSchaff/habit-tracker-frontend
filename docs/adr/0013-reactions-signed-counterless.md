---
status: accepted
date: 2026-06-25
accepted: 2026-06-25
---

# Reactions are signed and counter-less — a list of who, never a tally

Aurore ships lightweight reactions (`merci` / `moi-aussi` / `soutien`) on Posts, Threads, and their replies, as an entraide signal. This ADR fixes the doctrine: a reaction is always **signed** (attributable to its author, never anonymous), the API exposes only the **list of reactors per kind** (pseudonyms) and **never a count**, and **no surface anywhere orders or gates visibility by reactions**. Reviews are deliberately never reactable. Direct lineage of ADR-0005's anti-leaderboard tripwire.

## Why

The obvious shape for "react to a post" is a like button with a number — the industry default. That default is exactly the anti-pattern guide's §1/§4/§8 that Aurore refuses: an aggregate tally turns a warm acknowledgement into a popularity score, and a score invites sort-by-popularity, which invites a leaderboard. ADR-0005 carved a bounded exception for *self-authored* 1-5 ratings precisely because they are signed and never Aurore-aggregated; reactions stay on the same side of that line by construction.

The design pressure is real and recurring: a count is one `COUNT(*)` away, and "sort by most-supported" reads like an obvious next feature. Writing the constraint down — no count in the payload, no sort affordance — stops a future contributor from "completing" the feature in the direction the doctrine forbids.

Signed-not-anonymous is the other half. An anonymous reaction is a vote: it measures volume, not people. A signed one is a person saying *I'm here* to another person. The first is what we reject; the second is the entire point — "le vivant : réagir sans liker-voter".

## Considered options

- **A. Like button with a count (+ optional sort-by-popularity).** The industry default. Rejected: the count is an Aurore-computed aggregate (§1/§8), and it structurally invites ranking — the exact leaderboard ADR-0005 stays behind.
- **B. Anonymous reaction counts ("12 personnes ont réagi"), no names.** Rejected: strips the signature that makes a reaction entraide rather than a vote, and still ships a tally.
- **C. Signed reactor list per kind, no count, no sort, never on reviews.** **Chosen.** The data shipped equals the data shown equals a list of people; Aurore computes, ranks, and averages nothing.

## Consequences

- One polymorphic table `social_reactions` (`reactable_type ∈ {post, thread, post_reply, thread_reply}`, `reactable_id`, `user_id`, `kind`, `UNIQUE (reactable_type, reactable_id, user_id, kind)`). **No counter column exists** — a total is unrepresentable without a schema change that would itself flag the doctrine crossing.
- `reactable_type` deliberately excludes `review`; the service rejects it. A Review is a deposit leaf, not a conversation surface (anti-pattern #29, "feuille-dépôt").
- `user_id` is always present and surfaced — anonymous reactions are impossible by construction. The FK is `ON DELETE SET NULL` only for account deletion, where the row anonymizes like all soft-deleted authorship; live reactions are never anonymous.
- Multi-kind is allowed: the UNIQUE key includes `kind`, so one user may hold `merci` and `soutien` on the same target at once. `POST` ensures a kind on (idempotent insert), `DELETE` ensures it off; the client picks the verb from the viewer's current kinds.
- The read API returns `{ reactions: { <kind>: [{ username, profilePublic }] }, viewerKinds }`. `viewerKinds` drives button pressed-state **without a count**. No endpoint, feed, or list orders by reactions (the Tranche 7 feed orders by recency or similarity only).
- No referential FK on `reactable_id` (polymorphic); existence + visibility of the parent are enforced app-layer per type, mirroring `assertAnchorsExist`. A reaction on a hidden or missing parent is rejected with a uniform not-found (anti-enumeration).
- Creating a reaction is gated by `requireJwtAuth` + the global-ban floor only — no dedicated `ban_scope`. Reactions are low-stakes, signed, and bounded by the UNIQUE key (un-floodable); a dedicated scope is deferred until abuse is real.
- Residual tension, accepted (inherited from ADR-0005): a long signed reactor list reads, to the eye, like a tally. The mitigation is structural — no number is ever computed or sorted on. If a surface ever starts to feel like a leaderboard, revisit **here** before adding any count or sort affordance.
