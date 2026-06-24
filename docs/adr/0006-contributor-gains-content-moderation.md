---
status: implemented
date: 2026-05-30
accepted: 2026-05-30
implemented: 2026-06-24
---

# The contributor role (« modérateur ») becomes a content moderator; moderation splits into content/reversible (contributor) and account/irreversible (admin)

Aurore ships three exclusive roles — enum `user_role = ['user','admin','contributor']`. Until now the middle role (`contributor`, user-facing label « modérateur ») could only **curate** the catalogue (verify sheets, edit any sheet, link ingredients, apply tags, upload images); every act of **content moderation** (hiding reviews/threads/replies, bans, force-private) and every destructive/structural act was admin-exclusive. This ADR expands the contributor into a genuine content moderator, and draws the contributor↔admin line as **content-and-reversible** versus **account-and-irreversible**. It also settles the catalogue-trust surface (no submission queue; a positive « vérifiée » marker) and the post-verification recourse (freeze + open suggested-edit). S1 shipped (moderation routes, reports, suggested-edits, bans — all wired in `backend/src/index.ts`); this records the decision and the trade-offs behind it.

## Why

Three threads converged.

- **The mid-tier was a half-role.** Once the catalogue opens to public submissions (#16), *contributing* a sheet is universal — any authenticated user submits one, published immediately as `unverified`. So "contributor" no longer names a distinguishing power; the one thing the middle role uniquely does is *curate other people's contributions*. A tier whose only extra over a normal user is "catalogue write" is thin, and its label promised a moderation it did not perform — the matrix doc literally carried a disclaimer, « *Modérateur ≠ modération de contenu* ». A label that needs a disclaimer is fighting itself.
- **Admin was a single god-tier holding all content moderation.** With public submissions, the volume of spam / ads / bad sheets needing reactive cleanup grows, and routing every hide and ban through the solo admin is a bottleneck. The product owner's intent is explicit: the middle role should be *un vrai modérateur* — able to stop a user from publishing garbage and to clean bad content — not merely a catalogue librarian.
- **The benevolent-tool doctrine (zero guilt, calm) constrains HOW moderation may exist.** The resolution is to grant the mid-tier only *reversible, content-scoped* powers and keep every *irreversible, account-level* power with the admin. A moderator governs what you *post* (all recoverable); an admin governs *who you are* and *how the place is built*.

## Considered options

**Label — rename to « curateur » vs keep « modérateur ».** **Kept, *earned*.** Renaming to "curateur" was the honest fix *only if* the role stayed catalogue-only. The owner chose to expand the role into real content moderation, which earns the word. (Renaming the code enum `contributor` was never on the table — it threads RLS, middleware, and the store for zero benefit.)

**Moderation home — stays admin-exclusive vs pushed to the mid-tier.** **Pushed down.** Admin-only preserves a single accountable hand but makes the admin the bottleneck for all reactive cleanup and leaves the mid-tier thin. Pushing *reversible content* moderation to the moderator creates a substantive middle tier and unloads the solo admin. Mirrors Reddit (sub-moderator) and Discourse (moderator vs admin).

**Ban scope for the moderator — global too vs content-scoped only vs no bans (admin-only).** **Content-scoped only.**
- *No bans (moderator hides, admin bans)* was considered for purity — a peer never sanctions a person. Rejected: it makes the moderator one-armed (hide spam wave 1, the spammer re-posts wave 2, hide again — never cutting the source, escalating every time), which means *more* spam visible, *less* calm, and a permanent escalation tax. And a content-scoped, reversible ban is not a person-sanction; it is content-flow control — "turn off the tap."
- *Global ban (account lockout)* stays admin-only. It severs the user from their **private** space (collection, private notes, profile) over a **public** content offence — disproportionate, identity-level, and the biggest blast radius if a moderator goes rogue. Global ban serves account-level abuse (harassment via the account, ban-evasion) — a different job from keeping content clean.
- The moderator gets the five content scopes (`product_create`, `product_edit`, `ingredient_edit`, `discussion_post`, `review_publish`), all reversible/liftable; `global` stays admin.

**Catalogue submission — queue-before-publish vs publish-immediately + signal.** **Publish-immediately, no queue.** A queue would gate the catalogue more strictly than reviews (which publish instantly), import the friction Aurore rejects, and burden the curator with mandatory pre-approval. The real trust gap was never the missing queue — it is that `catalogQuality` was invisible to readers (now rendered as a positive « vérifiée » marker via `CatalogQualityBadge` in ProductLayout and IngredientLayout; the negative « ⚠ non vérifié » warning was intentionally omitted — signal is asymmetric by design). The lever is the *signal*, shown as a **positive** « vérifiée » marker on curated sheets — never a « ⚠ non vérifié » warning, which would shame the contributor and break zero-guilt. Spam is caught reactively (moderator hide + content-ban), not gated a priori.

**Post-verification recourse — report (A) vs suggested-edit (B).** **B, with open proposals.** A `verified` sheet freezes for its submitter so a checked sheet cannot be silently re-edited (this is what gives "verified" meaning). Recourse: A = a prose "report an error" the moderator acts on; B = a field-level suggested-edit (diff) the moderator accepts/rejects. Chose B open to *any authenticated user* (Wikipedia/Discogs model) — B only earns its small versioning surface if anyone can correct anything; restricted to the original submitter, A would have sufficed. Distinct from **Signaler** (bad content → hide): *improve* vs *destroy*, two separate queues.

## Consequences

- **Concrete moderator powers (all reversible):** hide a public review / discussion thread / reply / catalogue sheet; content-ban on the five scopes; own the report queue (resolve, dismiss, **escalate to admin**); plus the already-shipped curation (verify, edit any sheet, link, tag, upload, and accept/reject suggested-edits).
- **Admin-only, unchanged:** global ban, permanent delete, force-private profile, taxonomy, blog, role grant/revoke, dashboard.
- **De-dramatized UX is a hard condition, not a nicety.** The structure now has the shape of a conventional authority platform (moderators, bans, an approval queue, a `verified` tier). What keeps it Aurore is *tone*: a content-ban must read as « publication en pause » (reversible, neutral), never « tu es banni »; a pending suggested-edit must read as calm review, not bureaucratic gatekeeping; the trust marker stays positive. One shaming surface re-imports the authority the structure could otherwise carry. `review_publish` deserves the lightest hand — a review is personal experience ([ADR-0005](0005-public-reviews-opt-in-attributable-ratings.md)).
- **Granting this role now distributes ban power**, so role **revocation moves into scope** (#16b): an admin UI to demote a moderator, not a manual DB edit. Granting stays form + manual admin approval (sufficient vetting at solo scale).
- **Moderator→admin escalation is first-class**, so the moderator never "begs": an « escalader à l'admin » action files the case into the admin queue with context (v1); repeated content-bans on one user auto-surface as a global-ban candidate (v2, when volume justifies).
- **Residual tension, accepted:** the model is structurally a platform hierarchy; the vision survives only as long as the wording stays calm and every moderator action stays reversible. Revisit if any moderator surface starts to feel punitive.
- **Status: implemented (S1 shipped).** `03-features/admin/roles-and-permissions.html` and `03-features/admin/README.md` have been updated to reflect the shared admin∨contributor moderation shell.

## Implementation notes

- Role definitions: three exclusive roles (`user`, `contributor`, `admin`); contributor = content-and-reversible; admin = account-and-irreversible; curation (catalogue writes) is distinct from moderation (hiding/banning) is distinct from taxonomy (global tag structure, admin-only).
- Catalogue trust surface: sheets publish immediately as `unverified`; a positive « vérifiée » marker is set by the moderator after review; verified sheets freeze for their submitter; recourse is a field-level suggested-edit open to any authenticated user; bad content is handled reactively via Signaler (hide), not pre-moderation.
- Role revocation (#16b): admin UI to demote a moderator — now in scope alongside role grant.
- Suggested-edit (B) v1 defaults: moderator/admin edit directly; owner edits own sheet while `unverified`; everyone else proposes; proposable fields = the sheet's own (name / brand / INCI / description), tags + links stay moderator-direct; proposer notification deferred.
- Reuses existing primitives: `moderationColumns` (hide/restore), `banScopeEnum` minus `global`, `content_reports` (the queue, plus the new escalation, plus the suggested-edit channel as a sibling intent).
