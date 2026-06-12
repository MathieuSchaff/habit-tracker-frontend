// Per-tag hit-rate budgets: calibration drift detector for auto-tagging.
//
// Each entry caps the proportion of products (within a category) that may fire
// a given tag. The `CHECK=1` mode of `runners/audit/main.ts` validates the
// current corpus against this table:
//
//   FAIL: hit_rate > max  (regression: tag fires on too much of the corpus)
//   FAIL: min defined and hit_rate < min  (structural tag stopped firing)
//   WARN: tag fires but has no budget entry  (unrecorded, add one)
//   OK: within bounds
//
// Why per-category: skincare/solaire/bodycare have different INCI distributions
// (sunscreens are filter-heavy, body washes are surfactant-heavy). A single
// global budget would either accept noise on one category or false-fail on
// another. Categories listed in `AUTO_TAG_ELIGIBLE_CATEGORIES` (orchestrator).
//
// How to (re)seed: run `DUMP_BUDGETS=1 just audit-auto-tags`, paste the emitted
// block here, then tighten the sensitive tags (comedogene, non-comedogene,
// peau-sensible, hypoallergenique) by hand. The auto baseline is
// `max = min(1, ceil(current_hit_rate * 1.5, 0.05))`: generous headroom on
// most tags but too loose for safety-relevant signals.
//
// `min` is optional. Set it for tags that MUST fire on a category (e.g. a
// kind-derived `zone-visage` on skincare). Absent → only the max cap applies.
//
// Tags with `allow: false` in TAG_CONFIG are excluded; they already drop
// upstream and never need a budget. Tags re-emitted from `passes/formula/*`
// (peaux_atopiques, repulpant, matifiant) are covered here under their Aurore
// slugs; their algo-derm candidates fall as `unmapped` and don't show in the
// per-tag hit counts.

import type { SkincareProductTagSlug } from '@aurore/shared'

import { AUTO_TAG_ELIGIBLE_CATEGORIES } from '../orchestrator'

const BUDGET_CATEGORIES = AUTO_TAG_ELIGIBLE_CATEGORIES
export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number]

interface TagBudget {
  min?: number
  max: number
}

export type TagBudgetTable = Partial<
  Record<BudgetCategory, Partial<Record<SkincareProductTagSlug, TagBudget>>>
>

// Seeded 2026-05-13, re-baselined 2026-05-26 on v11, re-baselined 2026-06-12
// from DUMP_BUDGETS=1 against a corpus of 3684 products (3623 with INCI: 2820
// skincare / 422 solaire / 381 bodycare) on algo-derm TAG_DEFS v12. v12 FP/FN cleanup:
// active-list mapped tags fall back to coverage confidence when no benefit drivers
// → non-comedogene 6.5→9.4 % skincare, 5.8→8.3 % solaire (genuine improvement,
// not noise); hypoallergenique 12.9→16.3 % skincare; vegan caramel/mel fix and
// urea word-anchor have no net visible effect here (disallowed tags). Auto
// baseline = ceil(hit_rate × 1.5, 0.05); sensitives hand-tightened below that
// (see markers).
//
// Sensitives:
//   - `comedogene`: leave-on only, safety-relevant. Tight cap.
//   - `non-comedogene`: high-stake claim, must not creep on noisy INCI.
//   - `peau-sensible`: broad proxy for reactive-skin avoid flows.
//   - `hypoallergenique`: regulatory-adjacent claim.
export const TAG_HIT_RATE_BUDGET: TagBudgetTable = {
  skincare: {
    'sans-sulfates': { max: 1.0 }, // hit_rate=80.9%
    'sans-huiles-minerales': { max: 1.0 }, // hit_rate=80.2%
    'sans-alcool-denature': { max: 1.0 }, // hit_rate=79.3%
    'sans-allergenes-parfumants': { max: 1.0 }, // hit_rate=73.1%
    'sans-huiles-essentielles': { max: 1.0 }, // hit_rate=68.1%
    'sans-silicones': { max: 0.95 }, // hit_rate=62.2%
    'grossesse-compatible': { max: 0.9 }, // hit_rate=59.3%
    'sans-parfum': { max: 0.85 }, // hit_rate=56.1%
    'peau-sensible': { max: 0.55 }, // hit_rate=46.3% · tightened (sensitive)
    hyperpigmentation: { max: 0.45 }, // hit_rate=27.8%
    'pores-sebum': { max: 0.45 }, // hit_rate=26.9%
    'sebo-regulateur': { max: 0.4 }, // hit_rate=24.9%
    'rougeurs-vasculaires': { max: 0.35 }, // hit_rate=22.8%
    'acne-imperfections': { max: 0.35 }, // hit_rate=22.5%
    'non-irritant': { max: 0.35 }, // hit_rate=20.7%
    deshydratation: { max: 0.3 }, // hit_rate=19.6%
    hypoallergenique: { max: 0.18 }, // hit_rate=16.3% · tightened (sensitive)
    'barriere-cutanee': { max: 0.15 }, // hit_rate=7.2%
    reparateur: { max: 0.15 }, // hit_rate=7.2%
    'eclat-teint-uniforme': { max: 0.15 }, // hit_rate=6.7%
    'non-comedogene': { max: 0.11 }, // hit_rate=9.4% · tightened (sensitive)
    apaisant: { max: 0.1 }, // hit_rate=5.4%
    protection: { max: 0.1 }, // hit_rate=5.2%
    'anti-oxydant': { max: 0.1 }, // hit_rate=5.2%
    comedogene: { max: 0.08 }, // hit_rate=3.8% · tightened (sensitive)
    'anti-age': { max: 0.05 }, // hit_rate=3.0%
    'peau-grasse': { max: 0.05 }, // hit_rate=2.7%
    'peau-seche': { max: 0.05 }, // hit_rate=1.4%
  },
  solaire: {
    'sans-sulfates': { max: 1.0 }, // hit_rate=85.8%
    'sans-huiles-essentielles': { max: 1.0 }, // hit_rate=84.8%
    'sans-huiles-minerales': { max: 1.0 }, // hit_rate=84.3%
    'sans-allergenes-parfumants': { max: 1.0 }, // hit_rate=81.9%
    'grossesse-compatible': { max: 1.0 }, // hit_rate=70.8%
    'sans-alcool-denature': { max: 1.0 }, // hit_rate=63.4%
    'sans-silicones': { max: 0.75 }, // hit_rate=49.9%
    'sans-parfum': { max: 0.55 }, // hit_rate=34.5%
    'peau-sensible': { max: 0.45 }, // hit_rate=33.7% · tightened (sensitive)
    deshydratation: { max: 0.3 }, // hit_rate=19.0%
    'non-irritant': { max: 0.2 }, // hit_rate=12.8%
    hypoallergenique: { max: 0.14 }, // hit_rate=13.0% · tightened (sensitive)
    'acne-imperfections': { max: 0.15 }, // hit_rate=7.7%
    'pores-sebum': { max: 0.15 }, // hit_rate=7.7%
    'sebo-regulateur': { max: 0.15 }, // hit_rate=7.7%
    hyperpigmentation: { max: 0.15 }, // hit_rate=7.2%
    'rougeurs-vasculaires': { max: 0.1 }, // hit_rate=6.3%
    'non-comedogene': { max: 0.1 }, // hit_rate=8.3% · tightened (sensitive)
    apaisant: { max: 0.1 }, // hit_rate=4.1%
    comedogene: { max: 0.08 }, // hit_rate=3.6% · tightened (sensitive)
    protection: { max: 0.05 }, // hit_rate=2.9%
    'anti-oxydant': { max: 0.05 }, // hit_rate=2.9%
    'eclat-teint-uniforme': { max: 0.05 }, // hit_rate=1.0%
    'peau-grasse': { max: 0.05 }, // hit_rate=1.0%
    'barriere-cutanee': { max: 0.05 }, // hit_rate=1.0%
    reparateur: { max: 0.05 }, // hit_rate=1.0%
    'peau-seche': { max: 0.05 }, // hit_rate=0.5%
  },
  bodycare: {
    'sans-huiles-essentielles': { max: 1.0 }, // hit_rate=84.4%
    'sans-alcool-denature': { max: 1.0 }, // hit_rate=83.1%
    'sans-huiles-minerales': { max: 1.0 }, // hit_rate=77.8%
    'sans-allergenes-parfumants': { max: 1.0 }, // hit_rate=71.2%
    'sans-silicones': { max: 1.0 }, // hit_rate=66.1%
    'grossesse-compatible': { max: 1.0 }, // hit_rate=63.5%
    'sans-sulfates': { max: 0.95 }, // hit_rate=61.4%
    deshydratation: { max: 0.45 }, // hit_rate=29.1%
    'sans-parfum': { max: 0.45 }, // hit_rate=28.8%
    'non-irritant': { max: 0.45 }, // hit_rate=28.0%
    'peau-sensible': { max: 0.3 }, // hit_rate=23.0% · tightened (sensitive)
    'pores-sebum': { max: 0.25 }, // hit_rate=16.4%
    hyperpigmentation: { max: 0.25 }, // hit_rate=14.8%
    'rougeurs-vasculaires': { max: 0.25 }, // hit_rate=14.0%
    hypoallergenique: { max: 0.15 }, // hit_rate=11.4% · tightened (sensitive)
    'sebo-regulateur': { max: 0.15 }, // hit_rate=9.0%
    'acne-imperfections': { max: 0.15 }, // hit_rate=7.4%
    comedogene: { max: 0.09 }, // hit_rate=6.6% · tightened (sensitive)
    'barriere-cutanee': { max: 0.1 }, // hit_rate=5.0%
    reparateur: { max: 0.1 }, // hit_rate=5.0%
    'peau-seche': { max: 0.1 }, // hit_rate=4.0%
    'non-comedogene': { max: 0.08 }, // hit_rate=4.0% · tightened (sensitive)
    'eclat-teint-uniforme': { max: 0.05 }, // hit_rate=2.4%
    apaisant: { max: 0.05 }, // hit_rate=1.9%
    protection: { max: 0.05 }, // hit_rate=0.5%
    'anti-oxydant': { max: 0.05 }, // hit_rate=0.5%
    'peau-grasse': { max: 0.05 }, // hit_rate=0.3%
  },
}
