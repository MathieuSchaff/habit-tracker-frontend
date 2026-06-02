// Cross-signal tag enrichment: derives MOMENT_* and usage context tags by
// combining actif-class detection results with the product's kind.
//
// These tags can't be derived from INCI alone or kind alone; they need both:
//   - RETINOIDS actif → moment-soir   (photosensitizing, must be used at night)
//   - AHA actif       → moment-soir   (photosensitizing when used as leave-on)
//   - BHA actif       → moment-soir   (ditto, for leave-on formats)
//   - VITAMIN_C actif → moment-matin  (UV-synergistic antioxidant; also fires
//     on sunscreen kind; kind-tag already emits moment-matin, but the combo
//     SPF + vit-C is a recognized morning stack, reaffirmed at cross-signal
//     level so audit pipelines can attribute the pair)
//   - ENZYMES_EXFOLIANTS + exfoliant kind → moment-hebdomadaire (mask/peel use)
//   - hydroquinone in INCI + leave-on → moment-soir (oxidizes in UV;
//     prescription-grade depigmentant, banned in EU OTC but still seen)
//   - RETINOIDS actif + body leave-on → anti-age concern (algo-derm fires
//     anti-age via tagProduct, but body INCI tend to have lower coverage and
//     get gated by the computed_score floor; we re-emit here unconditionally)
//   - spot-treatment kind + (BHA OR benzoyl peroxide top 5 OR azelaic top 5) → moment-crise
//     (acute breakout treatment, episodic use)
//
// Rinse-off kinds (cleanser, body-wash, mask, patch) are excluded from
// leave-on photosensitivity warnings; context.leaveOn matters here.

import type { ProductKind } from '@aurore/shared'
import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import type { ProductAssessment } from 'algo-derm'

import { resolveIngredients } from '../lib/ingredient-resolver'

const S = SKINCARE_PRODUCT_TAG_SLUGS

const LEAVE_ON_KINDS = new Set<string>([
  'serum',
  'moisturizer',
  'toner',
  'essence',
  'eye-cream',
  'spot-treatment',
  'balm',
  'oil',
  'mist',
  'primer',
  'body-lotion',
  'body-oil',
  'body-cream',
  'hand-cream',
  'foot-cream',
  'lip-care',
])

const PERIODIC_EXFOLIANT_KINDS = new Set<string>(['exfoliant', 'mask', 'patch'])

// Excludes rinse-off (body-wash, body-scrub) and non-skincare (deodorant).
const BODY_LEAVE_ON_KINDS = new Set<string>(['body-lotion', 'body-oil', 'hand-cream', 'foot-cream'])

export function detectCrossSignalTags(
  actifClasses: SkincareProductTagSlug[],
  kind: ProductKind,
  inci?: string | null,
  hoistedIngredients?: readonly string[]
): SkincareProductTagSlug[] {
  const tags = new Set<SkincareProductTagSlug>()
  const actifSet = new Set(actifClasses)
  const isLeaveOn = LEAVE_ON_KINDS.has(kind)
  const isPeriodic = PERIODIC_EXFOLIANT_KINDS.has(kind)

  const ingredients = resolveIngredients(inci, hoistedIngredients)

  // Photosensitizing: night-only on all leave-on formats.
  if (actifSet.has(S.RETINOIDS) && isLeaveOn) {
    tags.add(S.MOMENT_SOIR)
  }

  if ((actifSet.has(S.AHA) || actifSet.has(S.BHA)) && isLeaveOn) {
    tags.add(S.MOMENT_SOIR)
  }

  if (
    (actifSet.has(S.AHA) || actifSet.has(S.BHA) || actifSet.has(S.ENZYMES_EXFOLIANTS)) &&
    isPeriodic
  ) {
    tags.add(S.MOMENT_HEBDOMADAIRE)
  }

  // Sunscreen not in LEAVE_ON_KINDS (would conflict with retinoid/AHA/BHA
  // night paths); included here explicitly because SPF + vit-C is the
  // canonical morning combo (X2).
  if (actifSet.has(S.VITAMIN_C) && (isLeaveOn || kind === 'sunscreen')) {
    tags.add(S.MOMENT_MATIN)
  }

  // Hydroquinone: Rx-only EU, not in actif-class taxonomy; detect inline.
  if (isLeaveOn && ingredients.length > 0) {
    if (ingredients.some((ing) => ing.includes('hydroquinone'))) {
      tags.add(S.MOMENT_SOIR)
    }
  }

  // Body INCI coverage tends to be lower; emit unconditionally rather than
  // relying on the computed_score floor gate in detectAutoTags.
  if (actifSet.has(S.RETINOIDS) && BODY_LEAVE_ON_KINDS.has(kind)) {
    tags.add(S.ANTI_AGE)
  }

  // Benzoyl peroxide and azelaic acid are not in actif-class taxonomy;
  // check INCI top 5 directly.
  if (kind === 'spot-treatment') {
    let crise = actifSet.has(S.BHA)
    if (!crise && ingredients.length > 0) {
      const top5 = ingredients.slice(0, Math.min(ingredients.length, 5))
      crise =
        top5.some((ing) => ing.includes('benzoyl peroxide')) ||
        top5.some((ing) => ing.includes('azelaic acid'))
    }
    if (crise) tags.add(S.MOMENT_CRISE)
  }

  return [...tags]
}

// Tags at relevance='avoid': retinoids + (AHA OR BHA) on leave-on → peau-sensible
// avoid. Stacking vitamin-A with chemical exfoliants is a classic dermo over-routine,
// unsafe for sensitive skin without clinician supervision.
export function detectCrossSignalAvoidTags(
  actifClasses: SkincareProductTagSlug[],
  kind: ProductKind
): SkincareProductTagSlug[] {
  const actifSet = new Set(actifClasses)
  const isLeaveOn = LEAVE_ON_KINDS.has(kind)

  const tags: SkincareProductTagSlug[] = []

  if (actifSet.has(S.RETINOIDS) && (actifSet.has(S.AHA) || actifSet.has(S.BHA)) && isLeaveOn) {
    tags.push(S.PEAU_SENSIBLE)
  }

  return tags
}

// Axis → avoid tag mapping (X3). Mitigations (adjustment <= 0) skipped.
// Leave-on only: rinse-off dilutes cumulative effect below clinical threshold
// (Lodén 2003; same rationale as comedogene excludeRinseOff).
//   - irritation | allergenicity → peau-sensible (cumulative barrier insult)
//   - dryness → peau-seche (alcohol+acid stacks amplify TEWL)
// comedogenicity and fungalAcne require acneProne profile gating; not emitted at seed.
// photosensitivity → moment-soir (secondary, not avoid) via detectInteractionSecondaryTags.
export function detectInteractionAvoidTags(
  assessment: ProductAssessment,
  kind: ProductKind
): SkincareProductTagSlug[] {
  if (!LEAVE_ON_KINDS.has(kind)) return []

  const tags = new Set<SkincareProductTagSlug>()
  for (const interaction of assessment.interactions) {
    if (interaction.adjustment <= 0) continue
    if (interaction.axes.includes('irritation') || interaction.axes.includes('allergenicity')) {
      tags.add(S.PEAU_SENSIBLE)
    }
    if (interaction.axes.includes('dryness')) {
      tags.add(S.PEAU_SECHE)
    }
  }
  return [...tags]
}

// Same leave-on gating and mitigation skip as detectInteractionAvoidTags, but
// emits at relevance=secondary. photosensitivity → moment-soir extends coverage
// to multi-essential-oil stacks (bergaptene-class furocoumarins) that don't
// trigger any actif-class.
export function detectInteractionSecondaryTags(
  assessment: ProductAssessment,
  kind: ProductKind
): SkincareProductTagSlug[] {
  if (!LEAVE_ON_KINDS.has(kind)) return []

  const tags = new Set<SkincareProductTagSlug>()
  for (const interaction of assessment.interactions) {
    if (interaction.adjustment <= 0) continue
    if (interaction.axes.includes('photosensitivity')) {
      tags.add(S.MOMENT_SOIR)
    }
  }
  return [...tags]
}

// Dose-gated peau-sensible avoid. Two regimes:
//
// CAPPED (EU regulatoryCapPct): solver clamps to cap, so solverMeanPct is robust
// with or without a curated pin. Threshold = cap x 0.83 to catch at-cap doses
// while sparing dermo-friendly traces (LRP Retinol B3 0.3 %, Cicaplast trace SA):
//   - retinol      cap = 0.3 % -> >= 0.25 %
//   - salicylic    cap = 2.0 % -> >= 1.5 %
//
// UNCAPPED: unpinned QP solver overshoots in trace zones (azelaic at INCI pos 2
// -> solver ~16 % regardless of real dose). Trust only when claimPct is defined
// (algo-derm pinned to a curated concentration, Phase 3b). Unpinned matches skipped.
// Gentle actives (bakuchiol, HPR ester) absent: high dose does not make them irritants.
//
// Leave-on only: rinse-off contact time too short for dose to matter.
const CAPPED_DOSE_RULES: Record<string, number> = {
  retinol: 0.25,
  'salicylic acid': 1.5,
}

const PINNED_DOSE_RULES: Record<string, number> = {
  'glycolic acid': 8,
  'lactic acid': 5,
  'mandelic acid': 5,
  'azelaic acid': 10,
  retinal: 0.05,
}

export function detectConcentrationAvoidTags(
  assessment: ProductAssessment,
  kind: ProductKind
): SkincareProductTagSlug[] {
  if (!LEAVE_ON_KINDS.has(kind)) return []

  const tags = new Set<SkincareProductTagSlug>()
  for (const m of assessment.matchedEvidence) {
    const { solverMeanPct, claimPct } = m.concentrationEstimate
    if (solverMeanPct === undefined) continue
    const lowerInci = m.evidence.inci.toLowerCase()

    const cappedThreshold = CAPPED_DOSE_RULES[lowerInci]
    if (cappedThreshold !== undefined) {
      if (solverMeanPct >= cappedThreshold) tags.add(S.PEAU_SENSIBLE)
      continue
    }
    const pinnedThreshold = PINNED_DOSE_RULES[lowerInci]
    if (
      pinnedThreshold !== undefined &&
      claimPct !== undefined &&
      solverMeanPct >= pinnedThreshold
    ) {
      tags.add(S.PEAU_SENSIBLE)
    }
  }
  return [...tags]
}
