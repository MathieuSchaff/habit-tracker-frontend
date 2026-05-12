// Cross-signal tag enrichment: derives MOMENT_* and usage context tags by
// combining actif-class detection results with the product's kind.
//
// These tags can't be derived from INCI alone or kind alone; they need both:
//   - RETINOIDS actif → moment-soir   (photosensitizing, must be used at night)
//   - AHA actif       → moment-soir   (photosensitizing when used as leave-on)
//   - BHA actif       → moment-soir   (ditto, for leave-on formats)
//   - VITAMIN_C actif → moment-matin  (UV-synergistic antioxidant; also fires
//     on sunscreen kind — kind-tag already emits moment-matin, but the combo
//     SPF + vit-C is a recognized morning stack, reaffirmed at cross-signal
//     level so audit pipelines can attribute the pair)
//   - ENZYMES_EXFOLIANTS + exfoliant kind → moment-hebdomadaire (mask/peel use)
//   - hydroquinone in INCI + leave-on → moment-soir (oxidizes in UV;
//     prescription-grade depigmentant, banned in EU OTC but still seen)
//   - RETINOIDS actif + body leave-on → anti-age concern (algo-derm fires
//     anti-age via tagProduct, but body INCI tend to have lower coverage and
//     get gated by the computed_score floor — we re-emit here unconditionally)
//   - spot-treatment kind + (BHA OR benzoyl peroxide top 5 OR azelaic top 5) → moment-crise
//     (acute breakout treatment, episodic use)
//
// Rinse-off kinds (cleanser, body-wash, mask, patch) are excluded from
// leave-on photosensitivity warnings — context.leaveOn matters here.

import type { ProductKind } from '@habit-tracker/shared'
import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@habit-tracker/shared'

import type { ProductAssessment } from 'algo-derm'

import { resolveIngredients } from '../lib/ingredient-resolver'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Kinds where leave-on actives stay in contact with skin long enough to matter.
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

// Body leave-on kinds where retinoids justify the `anti-age` concern slug.
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

  // Resolve once — used by hydroquinone (leave-on) and spot-treatment
  // branches. When inci is absent, returns [] and both branches no-op.
  const ingredients = resolveIngredients(inci, hoistedIngredients)

  // Retinoids → night-only; applies to all leave-on formats
  if (actifSet.has(S.RETINOIDS) && isLeaveOn) {
    tags.add(S.MOMENT_SOIR)
  }

  // AHA/BHA → photosensitizing leave-on actives → night
  if ((actifSet.has(S.AHA) || actifSet.has(S.BHA)) && isLeaveOn) {
    tags.add(S.MOMENT_SOIR)
  }

  // AHA/BHA in periodic-use formats (exfoliants, masks) → hebdomadaire
  if (
    (actifSet.has(S.AHA) || actifSet.has(S.BHA) || actifSet.has(S.ENZYMES_EXFOLIANTS)) &&
    isPeriodic
  ) {
    tags.add(S.MOMENT_HEBDOMADAIRE)
  }

  // Vitamin C → antioxidant + UV-synergistic → morning. Sunscreen is
  // intentionally not in LEAVE_ON_KINDS (would conflict with retinoid /
  // AHA / BHA → moment-soir paths), so we include it here explicitly:
  // SPF + vit-C is the canonical morning combo (X2).
  if (actifSet.has(S.VITAMIN_C) && (isLeaveOn || kind === 'sunscreen')) {
    tags.add(S.MOMENT_MATIN)
  }

  // Hydroquinone is photodegradable and increases UV sensitivity — never an
  // actif-class on its own (Rx-only EU), so detect inline from INCI.
  if (isLeaveOn && ingredients.length > 0) {
    if (ingredients.some((ing) => ing.includes('hydroquinone'))) {
      tags.add(S.MOMENT_SOIR)
    }
  }

  // Retinoids on body leave-on → anti-age concern, regardless of INCI coverage.
  if (actifSet.has(S.RETINOIDS) && BODY_LEAVE_ON_KINDS.has(kind)) {
    tags.add(S.ANTI_AGE)
  }

  // Spot-treatment with acute-acne actif → moment-crise (episodic use).
  // BHA actif-class covers salicylic acid; we additionally check INCI top 5
  // for benzoyl peroxide and azelaic acid (not in actif-class taxonomy).
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

// Cross-signal avoid
// Tags emitted at relevance='avoid' to flag products that are contraindicated
// for a given concern/skin-type. Same precedence pattern as grossesse-avoid:
// avoid wins over any secondary signal for the same (product, tag) pair.
//
// Rules:
//   - retinoids + (AHA OR BHA) on leave-on → `peau-sensible` avoid (stack
//     irritation: combining vitamin-A derivatives with chemical exfoliants
//     is a classic dermo over-routine; not safe for sensitive skin without
//     clinician supervision).

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

// Interaction-driven avoid — algo-derm `assessment.interactions` exposes
// the firable subset of `interaction_rules.json` (no profile/pH gating
// at seed-time). Mitigations (negative adjustment) are skipped — they
// signal protection, not risk. Leave-on only: rinse-off products dilute
// the cumul effect below the clinical threshold (Lodén 2003 on cumulative
// surfactant exposure; same rationale as `comedogene` excludeRinseOff).
//
// Axis → avoid tag mapping (X3):
//   - irritation OR allergenicity → `peau-sensible` (cumul barrier insult)
//   - dryness                     → `peau-seche`    (alcohol+acid stacks
//     amplify TEWL, contraindicated for already-dry skin types)
// `comedogenicity` and `fungalAcne` only fire under `acneProne` profile
// gating (no seed-time emission). `photosensitivity` → moment-soir
// (secondary, not avoid) — see `detectInteractionSecondaryTags` below.
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

// Interaction-driven secondary tags — same contract as the avoid version
// (skip mitigations, leave-on gating) but emits non-avoid signals. Today:
//   - photosensitivity → `moment-soir` (e.g. citrus + lavender essential
//     oil combo: bergaptène-class furocoumarins amplify UV reactivity).
// Stays distinct from `detectInteractionAvoidTags` because the orchestrator
// emits this at relevance=secondary (the cross-signal pass already emits
// moment-soir for AHA/BHA/retinoids; this extends coverage to multi-HE
// stacks that don't trigger any actif-class).
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
