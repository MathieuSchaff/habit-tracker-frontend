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
import type { TagEvidence } from '../lib/pass-types'

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
  // Match the whole INCI token instead of substring. Needed when the bare name
  // is a substring of unrelated ingredients (urea vs hydroxyethyl urea / botanicals).
  exact?: boolean
  // Tighter than default when the actif must be at functional concentration (acids).
  positionCap?: number
  // Looser cap for cleansers/exfoliants where actives sit deeper.
  positionCapRinseOff?: number
  // For pH-active acids: a rinse-off hit admitted only by the looser cap is a
  // pH-adjuster false positive (audit obs 1) UNLESS the product name positions it
  // as an exfoliant. Requires the caller to pass `productName`; absent name = legacy keep.
  rinseOffNameGate?: boolean
}

// Names that legitimately position a deep rinse-off acid as an exfoliant actif
// (rescues the cap-marginal gate). Matches exfoliant/exfoliation, (super)foliant,
// peel/peeling, gommage, resurfacing.
const EXFOLIATION_NAME_RE = /exfolia|foliant|peel|gommage|resurfa/

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
    patterns: ['glycolic acid', 'lactic acid', 'malic acid', 'tartaric acid', 'ammonium lactate'],
    // Common pH adjusters at pos > 10 in leave-on; rinse-off cap looser (surfactant-heavy formulas).
    // Cap-marginal rinse-off hits are pH adjusters unless the name says exfoliant (obs 1).
    positionCap: 10,
    positionCapRinseOff: 20,
    rinseOffNameGate: true,
  },
  {
    slug: SKINCARE_PRODUCT_TAG_SLUGS.AHA,
    patterns: ['mandelic acid'],
    // Mandelic acid is never used as a pH adjuster — always an exfoliant actif.
    positionCap: 15,
    positionCapRinseOff: 20,
  },
  {
    slug: SKINCARE_PRODUCT_TAG_SLUGS.BHA,
    patterns: ['salicylic acid', 'betaine salicylate'],
    // SA as preservative sits at pos 20+; pos 11-15 = actif exfoliant (e.g. bi-acid formulas).
    positionCap: 15,
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
    // Chelating use starts at pos 12+; pos 11 = exfoliant actif.
    positionCap: 11,
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
  {
    slug: SKINCARE_PRODUCT_TAG_SLUGS.UREA,
    // Exact match (mirrors algo-derm `^urea$`): substring `urea` would tag
    // diazolidinyl/imidazolidinyl urea (preservatives), hydroxyethyl urea
    // (humectant), and botanicals (centaurea, echinacea purpurea, sureau).
    patterns: ['urea'],
    exact: true,
    // Cap 12 = algo-derm ACTIVE_POS_CAP for keratolytique. Not Infinity: trace
    // urea is a humectant, only top-of-list urea is the keratolytic actif.
    positionCap: 12,
  },
]

// Slug-only view, kept as the stable API for the 6 callers + safety-net tests that
// only need membership. Insertion order mirrors the evidence map, so output is
// byte-identical to the pre-evidence implementation.
export function detectActifClasses(
  inci: string | null | undefined,
  hoistedIngredients?: readonly string[],
  kind?: ProductKind,
  productName?: string | null
): SkincareProductTagSlug[] {
  return [...detectActifClassesWithEvidence(inci, hoistedIngredients, kind, productName).keys()]
}

// Same matching as detectActifClasses, but records the triggering token, its INCI
// position, and the cap rule that admitted it — so audits can explain (and second-
// guess) each hit. First def that fires for a slug wins, mirroring the old Set
// dedup; within a def the earliest in-window token is the evidence.
export function detectActifClassesWithEvidence(
  inci: string | null | undefined,
  hoistedIngredients?: readonly string[],
  kind?: ProductKind,
  productName?: string | null
): Map<SkincareProductTagSlug, TagEvidence> {
  const evidence = new Map<SkincareProductTagSlug, TagEvidence>()
  const resolved = resolveIngredients(inci, hoistedIngredients)
  // Guard against empty tokens from hoisted callers.
  const ingredients = resolved.filter(Boolean)
  if (ingredients.length === 0) return evidence

  // Korean brands often list INCI alphabetically; position caps are meaningless then.
  const isAlpha = isAlphabeticalINCI(ingredients)
  const isRinseOffLike = kind !== undefined && RINSE_OFF_LIKE_KINDS.has(kind)
  // Empty/absent name disables the cap-marginal gate (legacy keep — see rinseOffNameGate).
  const gateName = productName?.trim().toLowerCase()

  for (const def of ACTIF_CLASS_DEFS) {
    if (evidence.has(def.slug)) continue
    const baseCap =
      isRinseOffLike && def.positionCapRinseOff !== undefined
        ? def.positionCapRinseOff
        : (def.positionCap ?? DEFAULT_POSITION_CAP)
    const cap = isAlpha ? ingredients.length : Math.min(ingredients.length, baseCap)
    for (let i = 0; i < cap; i++) {
      const ing = ingredients[i]
      const hit = def.exact ? def.patterns.includes(ing) : def.patterns.some((p) => ing.includes(p))
      if (hit) {
        // obs 1: a pH-active acid admitted only by the looser rinse-off cap (position
        // past the leave-on cap) is a pH adjuster, not an exfoliant — unless the name
        // positions the product as one. Skip lets a later def (e.g. mandelic) still fire.
        const capMarginal =
          !isAlpha &&
          isRinseOffLike &&
          def.positionCapRinseOff !== undefined &&
          i >= (def.positionCap ?? DEFAULT_POSITION_CAP)
        if (
          def.rinseOffNameGate &&
          capMarginal &&
          gateName &&
          !EXFOLIATION_NAME_RE.test(gateName)
        ) {
          continue
        }
        evidence.set(def.slug, {
          matchedToken: ing,
          position: i,
          sourceField: 'inci',
          rule: ruleLabel(def, isAlpha, isRinseOffLike, baseCap),
        })
        break
      }
    }
  }

  const rawLower = inci?.toLowerCase() ?? ''
  if (rawLower) {
    for (const def of ACTIF_CLASS_DEFS) {
      if (!RAW_SCAN_SLUGS.has(def.slug) || evidence.has(def.slug)) continue
      const matched = def.patterns.find((p) => rawLower.includes(p))
      if (matched !== undefined) {
        // Raw string is unsplit, so no position; the pattern is the only token we have.
        evidence.set(def.slug, { matchedToken: matched, sourceField: 'inci', rule: 'raw-scan' })
      }
    }
  }

  return evidence
}

function ruleLabel(
  def: ActifClassDef,
  isAlpha: boolean,
  isRinseOffLike: boolean,
  baseCap: number
): string {
  if (isAlpha) return 'alphabetical'
  const cap = Number.isFinite(baseCap) ? String(baseCap) : 'inf'
  if (isRinseOffLike && def.positionCapRinseOff !== undefined) return `positionCapRinseOff:${cap}`
  if (def.positionCap === undefined) return `positionCap:${DEFAULT_POSITION_CAP}(default)`
  return `positionCap:${cap}`
}
