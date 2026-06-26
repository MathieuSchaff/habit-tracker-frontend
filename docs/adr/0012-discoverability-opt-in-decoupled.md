---
status: accepted
date: 2026-06-25
accepted: 2026-06-25
---

# Profile discoverability is opt-in matching consent, decoupled from display visibility

The social layer ranks profiles by skin similarity so a user can find "people like me". Participating in that ranking is governed by a new per-user flag `discoverable` (column on `user_dermo_profiles`), **opt-in, default false**, effective only under the master `profile_public` gate. It is **distinct** from the `*_public` display flags: being *findable* (matched by the engine) is separated from being *readable* (fields shown on the profile). This ADR covers the consent primitive only; the ranking surface and its RLS policy land with the similarity-ranking slice.

## Why

A skin condition is intimate, almost medical. Two rights are in tension: helping others by assuming one's skin publicly, versus reading the community without exposing oneself. The similarity engine needs visibility to work; the calm/zero-guilt doctrine needs no unwanted exposure. Collapsing the two into the existing display flags would force a user to publish their concerns in order to be matched — exactly the exposure the doctrine refuses.

The decoupling has a real, honest cost: when the engine matches two people, the **shared bucket** is deducible by the person matched (they learn "we have a skin problem in the same family"). But the *other* concerns and the raw specifics stay private. So `discoverable` consents to bucket-level matching, not to display — and the consent copy must say so. This mirrors the same enumeration-safe, consent-explicit posture as ADR 0009/0010: the data consented equals the data exposed.

## Considered options

- **A. Findable by default (public).** Rejected. A skin condition is intimate; default-on violates zero-guilt and surprises the user. Growth pressure to opt in is a downstream UX concern, bounded by the anti-pressure guard — never a default.
- **B. Reuse `skinConcernsPublic` as the matching gate.** Rejected. Conflates display with matching: a user could not be matched without publishing their concerns in clear. Forces exposure to participate, the opposite of the intent.
- **C. Dedicated `discoverable` flag — opt-in, default off, under master `profile_public`, single flag (not per-concern).** **Chosen.** Consent is explicit and separate; one can be found by a bucket without exposing raw concerns; the matching runs server-side on private data and only an ordinal band surfaces.

## Consequences

- New column `user_dermo_profiles.discoverable` (boolean, NOT NULL, default `false`). Co-located with the dermo data and dermo display flags it governs, not on `profiles`. Migration `0103`. Safe default, no backfill.
- Effective only when `profile_public = true AND forced_private_by_admin = false`. A non-public or admin-force-privated profile is invisible to the engine regardless of `discoverable`. A non-discoverable profile is never matched.
- Added to `privacySettingsSchema` + `updatePrivacySettingsSchema` (shared) and the `DERMO_FLAG_KEYS` whitelist (service) — the three places a privacy flag must appear, or the PATCH silently ignores it.
- **Not** part of the public profile view payload (`PublicProfileView`): it is consent, not a display field. It surfaces only in the owner's privacy settings.
- The consent copy in the settings UI must name the bucket-deduction leak ("the problem you're found by can be deduced; your other information stays private").
- Follow-on (similarity-ranking slice): a cross-user permissive SELECT policy `user_dermo_profiles_select_discoverable` (SECURITY DEFINER pattern, cf migration 0067) exposing opt-in rows to the ranking; the ranking returns the ordinal band only, never the internal score (consistent with the no-score doctrine and ADR 0005).
- **As-built correction (mig 0104):** the policy shipped as a **plain EXISTS**, not SECURITY DEFINER. The `profiles` policies never reference `user_dermo_profiles`, so the 0067 recursion cycle does not apply and the wrapper was unnecessary.
