// Per-tag hit-rate budgets — calibration drift detector for auto-tagging.
//
// Each entry caps the proportion of products (within a category) that may fire
// a given tag. The `CHECK=1` mode of `runners/audit/main.ts` validates the
// current corpus against this table:
//
//   FAIL — hit_rate > max  (regression: tag fires on too much of the corpus)
//   FAIL — min defined and hit_rate < min  (structural tag stopped firing)
//   WARN — tag fires but has no budget entry  (unrecorded — add one)
//   OK   — within bounds
//
// Why per-category: skincare/solaire/bodycare have different INCI distributions
// (sunscreens are filter-heavy, body washes are surfactant-heavy). A single
// global budget would either accept noise on one category or false-fail on
// another. Categories listed in `AUTO_TAG_ELIGIBLE_CATEGORIES` (orchestrator).
//
// How to (re)seed: run `DUMP_BUDGETS=1 just audit-auto-tags`, paste the emitted
// block here, then tighten the sensitive tags (comedogene, non-comedogene,
// peau-sensible, hypoallergenique) by hand. The auto baseline is
// `max = min(1, ceil(current_hit_rate * 1.5, 0.05))` — generous headroom on
// most tags but too loose for safety-relevant signals.
//
// `min` is optional. Set it for tags that MUST fire on a category (e.g. a
// kind-derived `zone-visage` on skincare). Absent → only the max cap applies.
//
// Tags with `allow: false` in TAG_CONFIG are excluded — they already drop
// upstream and never need a budget. Tags re-emitted from `passes/formula/*`
// (peaux_atopiques, repulpant, matifiant) are covered here under their Aurore
// slugs; their algo-derm candidates fall as `unmapped` and don't show in the
// per-tag hit counts.

import type { SkincareProductTagSlug } from '@habit-tracker/shared'

import { AUTO_TAG_ELIGIBLE_CATEGORIES } from '../orchestrator'

export const BUDGET_CATEGORIES = AUTO_TAG_ELIGIBLE_CATEGORIES
export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number]

export interface TagBudget {
  min?: number
  max: number
}

export type TagBudgetTable = Partial<
  Record<BudgetCategory, Partial<Record<SkincareProductTagSlug, TagBudget>>>
>

// Seeded 2026-05-13 from DUMP_BUDGETS=1 against a corpus of 3601 products with
// INCI (2808 skincare / 415 solaire / 378 bodycare). Re-baselined 2026-05-13
// after B3 (per-axis AXIS_BENEFIT_THRESHOLDS / TAG_DEFS_VERSION 5) — apaisant,
// anti-oxydant, eclat, barriere-cutanee, reparateur, protection, peau-grasse
// all shifted up as the previously signal-mute 0.35 thresholds dropped to P85.
// Auto baseline = ceil(hit_rate × 1.5, 0.05). Sensitives tightened to ~× 2.
//
// Sensitives:
//   - `comedogene`        — leave-on only, safety-relevant. Tight cap.
//   - `non-comedogene`    — high-stake claim, must not creep on noisy INCI.
//   - `peau-sensible`     — broad proxy for reactive-skin avoid flows.
//   - `hypoallergenique`  — regulatory-adjacent claim.
export const TAG_HIT_RATE_BUDGET: TagBudgetTable = {
  skincare: {
    'sans-sulfates': { max: 1.0 }, // hit_rate=82.4%
    'sans-huiles-minerales': { max: 1.0 }, // hit_rate=81.6%
    'sans-allergenes-parfumants': { max: 1.0 }, // hit_rate=74.5%
    'grossesse-compatible': { max: 1.0 }, // hit_rate=72.0%
    'sans-huiles-essentielles': { max: 1.0 }, // hit_rate=69.3%
    'sans-silicones': { max: 0.95 }, // hit_rate=63.3%
    'sans-parfum': { max: 0.9 }, // hit_rate=57.1%
    'peau-sensible': { max: 0.5 }, // hit_rate=36.8% · tightened (sensitive)
    hyperpigmentation: { max: 0.45 }, // hit_rate=29.1%
    'acne-imperfections': { max: 0.45 }, // hit_rate=27.8%
    'pores-sebum': { max: 0.45 }, // hit_rate=27.8%
    'sebo-regulateur': { max: 0.45 }, // hit_rate=27.8%
    'rougeurs-vasculaires': { max: 0.4 }, // hit_rate=25.7%
    'barriere-cutanee': { max: 0.4 }, // hit_rate=23.9%
    reparateur: { max: 0.4 }, // hit_rate=23.9%
    deshydratation: { max: 0.35 }, // hit_rate=21.7%
    'non-irritant': { max: 0.35 }, // hit_rate=21.0%
    'eclat-teint-uniforme': { max: 0.3 }, // hit_rate=17.8%
    apaisant: { max: 0.25 }, // hit_rate=14.6%
    'peau-seche': { max: 0.15 }, // hit_rate=9.0%
    protection: { max: 0.15 }, // hit_rate=8.7%
    'anti-oxydant': { max: 0.15 }, // hit_rate=8.7%
    hypoallergenique: { max: 0.13 }, // hit_rate=8.5% · tightened (sensitive)
    'peau-grasse': { max: 0.15 }, // hit_rate=6.9%
    'anti-age': { max: 0.1 }, // hit_rate=5.7%
    'non-comedogene': { max: 0.08 }, // hit_rate=4.2% · tightened (sensitive)
    comedogene: { max: 0.08 }, // hit_rate=4.0% · tightened (sensitive)
  },
  solaire: {
    'sans-sulfates': { max: 1.0 }, // hit_rate=87.0%
    'sans-huiles-essentielles': { max: 1.0 }, // hit_rate=86.0%
    'sans-huiles-minerales': { max: 1.0 }, // hit_rate=85.5%
    'sans-allergenes-parfumants': { max: 1.0 }, // hit_rate=83.1%
    'grossesse-compatible': { max: 1.0 }, // hit_rate=80.2%
    'sans-silicones': { max: 0.8 }, // hit_rate=51.1%
    'sans-parfum': { max: 0.55 }, // hit_rate=35.2%
    'peau-sensible': { max: 0.35 }, // hit_rate=25.1% · tightened (sensitive)
    deshydratation: { max: 0.35 }, // hit_rate=20.0%
    'non-irritant': { max: 0.2 }, // hit_rate=12.0%
    'acne-imperfections': { max: 0.15 }, // hit_rate=9.9%
    'pores-sebum': { max: 0.15 }, // hit_rate=9.9%
    'sebo-regulateur': { max: 0.15 }, // hit_rate=9.9%
    hypoallergenique: { max: 0.13 }, // hit_rate=9.4% · tightened (sensitive)
    hyperpigmentation: { max: 0.15 }, // hit_rate=8.0%
    'barriere-cutanee': { max: 0.15 }, // hit_rate=6.7%
    reparateur: { max: 0.15 }, // hit_rate=6.7%
    protection: { max: 0.1 }, // hit_rate=6.5%
    'anti-oxydant': { max: 0.1 }, // hit_rate=6.5%
    apaisant: { max: 0.1 }, // hit_rate=5.8%
    'non-comedogene': { max: 0.1 }, // hit_rate=5.8% · tightened (sensitive)
    'rougeurs-vasculaires': { max: 0.1 }, // hit_rate=5.8%
    'eclat-teint-uniforme': { max: 0.1 }, // hit_rate=5.3%
    'peau-seche': { max: 0.1 }, // hit_rate=5.1%
    comedogene: { max: 0.08 }, // hit_rate=3.9% · tightened (sensitive)
    'peau-grasse': { max: 0.1 }, // hit_rate=3.6%
    'anti-age': { max: 0.05 }, // hit_rate=0.2%
  },
  bodycare: {
    'sans-huiles-essentielles': { max: 1.0 }, // hit_rate=85.2%
    'sans-huiles-minerales': { max: 1.0 }, // hit_rate=78.6%
    'grossesse-compatible': { max: 1.0 }, // hit_rate=77.2%
    'sans-allergenes-parfumants': { max: 1.0 }, // hit_rate=72.0%
    'sans-silicones': { max: 1.0 }, // hit_rate=66.9%
    'sans-sulfates': { max: 0.95 }, // hit_rate=62.2%
    deshydratation: { max: 0.5 }, // hit_rate=31.0%
    'sans-parfum': { max: 0.45 }, // hit_rate=29.4%
    'non-irritant': { max: 0.4 }, // hit_rate=26.5%
    'peau-sensible': { max: 0.3 }, // hit_rate=22.5% · tightened (sensitive)
    'barriere-cutanee': { max: 0.3 }, // hit_rate=19.3%
    reparateur: { max: 0.3 }, // hit_rate=19.3%
    'acne-imperfections': { max: 0.3 }, // hit_rate=17.2%
    'pores-sebum': { max: 0.3 }, // hit_rate=17.2%
    'sebo-regulateur': { max: 0.3 }, // hit_rate=17.2%
    'rougeurs-vasculaires': { max: 0.25 }, // hit_rate=15.1%
    hyperpigmentation: { max: 0.25 }, // hit_rate=14.8%
    'peau-seche': { max: 0.25 }, // hit_rate=13.8%
    hypoallergenique: { max: 0.13 }, // hit_rate=9.0% · tightened (sensitive)
    comedogene: { max: 0.12 }, // hit_rate=6.9% · tightened (sensitive)
    apaisant: { max: 0.15 }, // hit_rate=6.9%
    'eclat-teint-uniforme': { max: 0.1 }, // hit_rate=4.5%
    'peau-grasse': { max: 0.05 }, // hit_rate=3.2%
    'non-comedogene': { max: 0.05 }, // hit_rate=2.9% · tightened (sensitive)
    protection: { max: 0.05 }, // hit_rate=2.1%
    'anti-oxydant': { max: 0.05 }, // hit_rate=2.1%
    'anti-age': { max: 0.05 }, // hit_rate=0.8%
  },
}
