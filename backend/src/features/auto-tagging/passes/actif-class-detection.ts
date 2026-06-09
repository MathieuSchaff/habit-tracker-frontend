// Pharmacological cluster detection for skincare products.
//
// Patterns target canonical INCI fragments (lowercase, post-algo-derm normalize).
// Matcher is OR-of-substring; add a pattern = add a new INCI alias.
//
// Position gating: actifs at position 25+ are rarely at functional concentration
// (AHA as pH adjuster, trace niacinamide). Each cluster declares `positionCap`.
// pH-dependent acids (AHA/BHA/PHA) use a tight cap; antioxidants/humectants/
// ceramides use Infinity because the gold-set tags them regardless of INCI position.
//
// An earlier attempt gated on `concentrationEstimate.belowBreakpoint` (EU <1% zone)
// to replace position caps. Gold-set audit (2026-05-14) rejected it: macro F1 dropped
// 0.995 -> 0.930 (vitamin-e/HA/ceramides are functional below 1%; AHA/BHA/PHA
// breakpoint reads also disagreed with gold).

import type { ProductKind } from '@aurore/shared'
import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { isAlphabeticalINCI, resolveIngredients } from '../lib/ingredient-resolver'

const DEFAULT_POSITION_CAP = 12

// Clusters that need a secondary scan against the raw lowercase INCI (pre-normalize).
// algo-derm `applyCompositeFerment` strips the substrate from ferment names by design
// (postbiotic risk is organism-driven). For polyphenols the substrate IS the actif
// source, so re-scan raw INCI to recover those hits. No position cap here because the
// raw string is unsplit; polyphenols already use positionCap: Infinity anyway.
const RAW_SCAN_SLUGS = new Set<SkincareProductTagSlug>([SKINCARE_PRODUCT_TAG_SLUGS.POLYPHENOLS])

// AHA/BHA/PHA sit at pos 12-18 in rinse-off formulas (surfactant-heavy push),
// but are at functional concentration there. Looser cap for these kinds.
const RINSE_OFF_LIKE_KINDS = new Set<ProductKind>([
  'cleanser',
  'body-wash',
  'body-scrub',
  'exfoliant',
  'mask',
])

export interface ActifClassDef {
  slug: SkincareProductTagSlug
  patterns: string[]
  // Tighter than default when the actif must be at functional concentration (acids).
  positionCap?: number
  // Looser cap for cleansers/exfoliants where actives sit deeper.
  positionCapRinseOff?: number
}

export const ACTIF_CLASS_DEFS: ActifClassDef[] = [
  {
    slug: SKINCARE_PRODUCT_TAG_SLUGS.RETINOIDS,
    // Vit-A derivatives dosed 0.01-1%: encapsulated forms sit deep in INCI
    // (median pos 26, p90 39). Cap removed to align with manual corpus.
    // `bakuchiol` and `beta-carotene` excluded: functional alternatives, not
    // chemically vit-A.
    patterns: [
      'retinol',
      'retinal',
      'retinaldehyde',
      'tretinoin',
      'isotretinoin',
      'alitretinoin',
      'adapalene',
      'tazarotene',
      'trifarotene',
      'retinyl palmitate',
      'retinyl acetate',
      'retinyl propionate',
      'retinyl linoleate',
      'retinyl retinoate',
      'hydroxypinacolone retinoate',
      'sodium retinoyl hyaluronate',
    ],
    positionCap: Number.POSITIVE_INFINITY,
  },
  {
    slug: SKINCARE_PRODUCT_TAG_SLUGS.VITAMIN_C,
    // Vit-C esters stabilized at sub-1% deep in formula (median pos 25, p90 40).
    // Cap removed to align with manual corpus. Substring matching catches
    // `3-O-ethyl ascorbic acid` via `ethyl ascorbic acid` and glommed forms.
    patterns: [
      'ascorbic acid',
      'ascorbyl glucoside',
      'sodium ascorbyl phosphate',
      'magnesium ascorbyl phosphate',
      'tetrahexyldecyl ascorbate',
      'ethyl ascorbic acid',
      'ascorbyl palmitate',
      'ascorbyl tetraisopalmitate',
      'glyceryl ascorbate',
      // Catches "Vitamin C Ester (Ascorbyl Palmitate)" when normalization
      // drops the parenthetical, leaving `vitamin c ester` as the residual.
      'vitamin c ester',
    ],
    positionCap: Number.POSITIVE_INFINITY,
  },
  {
    slug: SKINCARE_PRODUCT_TAG_SLUGS.VITAMIN_E,
    // Vit-E sits in INCI tail (<=1% dosing); 100% of only_db drift was past
    // pos 12. Manual corpus tags regardless of position, so cap removed.
    // `tocopheryl` catches all esters; `vitamin e`/`vitamine-e` catch the
    // marketing-form residual after algo-derm strips parens content.
    patterns: ['tocopherol', 'tocopheryl', 'tocotrienol', 'vitamin e', 'vitamine-e'],
    positionCap: Number.POSITIVE_INFINITY,
  },
  {
    slug: SKINCARE_PRODUCT_TAG_SLUGS.AHA,
    patterns: [
      'glycolic acid',
      'lactic acid',
      'mandelic acid',
      'malic acid',
      'tartaric acid',
      'ammonium lactate',
    ],
    // Acids at pos > 10 are pH adjusters, not exfoliants, in leave-on products.
    // Rinse-off cap is looser because surfactant-heavy formulas push acids to pos 12-18.
    positionCap: 10,
    positionCapRinseOff: 20,
  },
  {
    slug: SKINCARE_PRODUCT_TAG_SLUGS.BHA,
    patterns: ['salicylic acid', 'betaine salicylate'],
    // Free SA + betaine salicylate at pos > 10 leave-on = preservative, not exfoliant.
    positionCap: 10,
    positionCapRinseOff: 20,
  },
  {
    slug: SKINCARE_PRODUCT_TAG_SLUGS.BHA,
    // Slow-release ester, functional at 0.05-0.1% and routinely at pos 13-20.
    // No preservative usage, so position cap dropped.
    patterns: ['capryloyl salicylic acid'],
    positionCap: Number.POSITIVE_INFINITY,
  },
  {
    slug: SKINCARE_PRODUCT_TAG_SLUGS.PHA,
    patterns: ['gluconolactone', 'lactobionic acid', 'galactose'],
    positionCap: 10,
    positionCapRinseOff: 20,
  },
  {
    slug: SKINCARE_PRODUCT_TAG_SLUGS.ENZYMES_EXFOLIANTS,
    // Bio-actives dosed mg-range; manual corpus tags at any position (median 20, p90 38).
    // `lipase` added: missed by prior pattern list in multi-enzyme exfoliants.
    // `protease` catches generic enzyme listings; named variants covered separately.
    patterns: ['papain', 'bromelain', 'subtilisin', 'protease', 'lipase'],
    positionCap: Number.POSITIVE_INFINITY,
  },
  {
    slug: SKINCARE_PRODUCT_TAG_SLUGS.CERAMIDES,
    // Sub-1% dosing; listed deep (median pos 27, p90 39). Cap removed to align
    // with manual corpus. `ng`/`as` types added (observed in cica/relipidant blends).
    // `phytosphingosine` rejected: 0 recall gain but 24 over-tags on soothing
    // products not classified as ceramides in the gold-set.
    patterns: [
      'ceramide np',
      'ceramide ap',
      'ceramide ns',
      'ceramide ng',
      'ceramide as',
      'ceramide eop',
      'ceramide eos',
      'ceramide 1',
      'ceramide 2',
      'ceramide 3',
      'ceramide 6',
    ],
    positionCap: Number.POSITIVE_INFINITY,
  },
  {
    slug: SKINCARE_PRODUCT_TAG_SLUGS.HYALURONIC_ACID,
    // <=1% cosmetic dosing; functional at any position (100% of only_db drift past
    // pos 10, median 19, p90 34). `hyaluron` catches all variants including
    // crosspolymer, modified, and non-standard spelling forms.
    patterns: ['hyaluron'],
    positionCap: Number.POSITIVE_INFINITY,
  },
  {
    slug: SKINCARE_PRODUCT_TAG_SLUGS.PEPTIDES,
    // Signaling-active at trace; always in INCI tail (median pos 25, p90 42).
    // `peptide` catches all chain lengths and acyl prefixes. Brand names retained
    // for INCI that list marketing names instead of technical INCI names.
    patterns: ['peptide', 'matrixyl', 'argireline', 'syn-ake', 'pdrn'],
    positionCap: Number.POSITIVE_INFINITY,
  },
  {
    slug: SKINCARE_PRODUCT_TAG_SLUGS.POLYPHENOLS,
    // Trace dosing; manual corpus tags past pos 12 (median 22, p90 35). Cap removed.
    // `camellia sinensis` without `leaf extract` qualifier catches seed oil too
    // (manual baseline tags both forms). `vitis vinifera` added as top-8 missed variant.
    patterns: [
      'resveratrol',
      'epigallocatechin',
      'ferulic acid',
      // Ferulic acid esters (ethylhexyl/ethyl ferulate): same polyphenol
      // pharmacophore, missed by `ferulic acid` substring.
      'ferulate',
      'camellia sinensis',
      // algo-derm strips the Latin parenthetical from "Green Tea (Camellia Sinensis
      // Leaf) Extract", leaving `green tea extract` as the residual.
      'green tea',
      'curcuma longa',
      'rosmarinus officinalis',
      'punica granatum',
      'polygonum cuspidatum',
      'cistus monspeliensis',
      'quercetin',
      'vitis vinifera',
      'melissa officinalis',
      // Both plant name and alt INCI form (standardized flavonolignan complex).
      'silybum marianum',
      'silymarin',
      // Theobroma cacao rejected (audit 2026-05-13): 62 over-tags vs 2 recall gains.
      // Manual baseline judges trace cacao extract as non-functional polyphenol dose.
    ],
    positionCap: Number.POSITIVE_INFINITY,
  },
  {
    slug: SKINCARE_PRODUCT_TAG_SLUGS.TYROSINASE_INHIBITORS,
    // Sub-1% dosing; manual corpus tags at any position (median 18, p90 33). Cap removed.
    // `arbutin` catches `alpha-arbutin` and `deoxyarbutin` via substring.
    // Excluded by mechanism mismatch:
    // - `glycyrrhiza`/`glycyrrhizate`: +401 over-tags; pigmentation signal only when
    //   combined with kojic/arbutin/morus alba (already caught).
    // - `niacinamide`: inhibits melanosome transfer, not tyrosinase; would over-broaden
    //   to most niacinamide products.
    patterns: [
      'kojic acid',
      'arbutin',
      'tranexamic acid',
      'ellagic acid',
      'morus alba',
      'undecylenoyl phenylalanine',
      'hexylresorcinol',
      // Mela B3 (La Roche-Posay): direct tyrosinase pathway inhibitor.
      '2-mercaptonicotinoyl glycine',
      // Boldine (diacetyl boldine = Lumiskin): competitive tyrosinase inhibitor.
      'boldine',
      // Competitive tyrosinase inhibitor + anti-acne; specific token, low over-tag risk.
      'azelaic acid',
    ],
    positionCap: Number.POSITIVE_INFINITY,
  },
]

export function detectActifClasses(
  inci: string | null | undefined,
  hoistedIngredients?: readonly string[],
  kind?: ProductKind
): SkincareProductTagSlug[] {
  const resolved = resolveIngredients(inci, hoistedIngredients)
  // Guard against empty tokens from hoisted callers.
  const ingredients = resolved.filter(Boolean)
  if (ingredients.length === 0) return []

  // Korean brands often list INCI alphabetically; position caps are meaningless then.
  const isAlpha = isAlphabeticalINCI(ingredients)
  const isRinseOffLike = kind !== undefined && RINSE_OFF_LIKE_KINDS.has(kind)

  const found = new Set<SkincareProductTagSlug>()
  for (const def of ACTIF_CLASS_DEFS) {
    const baseCap =
      isRinseOffLike && def.positionCapRinseOff !== undefined
        ? def.positionCapRinseOff
        : (def.positionCap ?? DEFAULT_POSITION_CAP)
    const cap = isAlpha ? ingredients.length : Math.min(ingredients.length, baseCap)
    const cappedIngredients = ingredients.slice(0, cap)
    if (def.patterns.some((p) => cappedIngredients.some((ing) => ing.includes(p)))) {
      found.add(def.slug)
    }
  }

  const rawLower = inci?.toLowerCase() ?? ''
  if (rawLower) {
    for (const def of ACTIF_CLASS_DEFS) {
      if (!RAW_SCAN_SLUGS.has(def.slug) || found.has(def.slug)) continue
      if (def.patterns.some((p) => rawLower.includes(p))) found.add(def.slug)
    }
  }

  return [...found]
}
