---
status: accepted
date: 2026-05-24
accepted: 2026-05-24
---

# Three formula passes re-emit algo-derm slugs with chemistry-aware gating

The auto-tagging pipeline runs algo-derm's `tagProduct()` as Pass 1 (`passes/auto-tag-detection.ts`), which emits 38 candidate tags. For three of those — `peaux_atopiques`, `repulpant`, `matifiant` — Aurore drops the algo-derm candidate (no `TAG_CONFIG` entry → `unmapped` → dropped) and re-emits the equivalent slug from a dedicated Pass-4 formula detector instead (`passes/formula/{eczema-atopie,repulpant,fini-mat}.ts`). We keep this duplication and will not consolidate it into a `TAG_CONFIG` floor override.

## Why

algo-derm and the formula passes reason over **different inputs**, not the same input at a different threshold:

- algo-derm's rules for these three slugs key on **computed axis scores** (`peaux_atopiques`: irritation+allergenicity risk both below a floor with no fragrance/sulfate/soap flags; `repulpant`: HA/glycerin presence top 12; `matifiant`: `seborrheicRegulation ≥ P85`). These fire on 22 % / 78 % / the entire `peau-grasse` set of the corpus — non-discriminating signal.
- The formula passes key on **named-ingredient co-presence patterns**: `eczema-atopie` requires colloidal oatmeal (`avena sativa kernel`, the FDA OTC eczema protectant) OR ≥2 distinct ceramide variants top 12 + fragrance-free + no sulfate top 5; `repulpant` requires HA top 8 AND a pure glycerin token top 5 AND ≥1 canonical plumping peptide (Argireline / palmitoyl tripeptide-1); `fini-mat` requires a literal absorbent powder (silica/kaolin/perlite/talc/starch) top 8.

There is no shared knob to tune. `matifiant` is the clearest case: algo-derm infers it from a sebum-regulation *score*, the formula pass keys on the *presence of an absorbent powder* — a product can score high on sebum-regulation with zero absorbent ingredients, and vice-versa. Lowering or raising an algo-derm floor cannot reproduce the formula-pass logic because the formula pass does not consume the algo-derm axis at all.

The boundary rule this ADR fixes: **map an algo-derm tag in `TAG_CONFIG` when calibrating its floors yields a discriminating signal; re-emit from a formula pass when the slug needs chemistry-aware co-presence the algo-derm axis can't express.** The re-emit path costs ~150-250 LOC across the three files; that cost buys precision the score-based rule structurally cannot reach.

## Considered options

- **A. Map the three slugs in `TAG_CONFIG` with a tighter `coverageFloor`/`confidenceFloor`.** Rejected. The algo-derm candidate is a single score per slug; no floor on that score reproduces "oatmeal present" or "absorbent powder top 8". Tightening the floor only trims the broad fire, it does not change *what* fires.
- **B. Keep the three formula passes, drop the algo-derm candidate as `unmapped`, document the boundary in this ADR.** **Chosen.** The duplication is intentional and the inputs are genuinely distinct.
- **C. Push the chemistry-aware logic upstream into algo-derm `tagProduct()`.** Rejected. The named-pattern lists (plumping peptides, absorbent powders, oat-vs-non-oat botanical parts) are Aurore product-ontology decisions, FR-first, and tuned against the Aurore seed corpus. Coupling them into the shared MIT lib would leak Aurore taxonomy into a stateless general-purpose engine and make every recalibration a tarball round-trip (`just vendor-algo-derm` + `reinstall-backend`).

## Consequences

- `peaux_atopiques`, `repulpant`, `matifiant` stay permanently in algo-derm's `unmapped` drop bucket. This is **expected**, not drift — audit tooling (`dropCounts.unmapped`) will always list them. A future reader seeing them unmapped should land here, not "fix" them by adding a `TAG_CONFIG` entry.
- The three formula passes own these slugs end-to-end. The parity test (`tests/auto-tag-orchestrator-parity.test.ts`) and the per-pass shape tests are the safety net — there is no algo-derm rule cross-checking them.
- algo-derm `TAG_DEFS_VERSION` bumps do not affect these three slugs' output, because Aurore ignores the algo-derm candidate. Recalibration (the `CALIBRATED_FOR_TAG_DEFS_VERSION` gate) covers the 29 mapped tags only.
- If a future algo-derm version reworks one of these rules to gate on named-ingredient co-presence (matching the formula-pass intent), revisit: the duplication would then collapse to option A and this ADR can be superseded.
</content>
</invoke>
