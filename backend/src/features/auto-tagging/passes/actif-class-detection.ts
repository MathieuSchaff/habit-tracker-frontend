// Pharmacological cluster detection for skincare products.
//
// Reads a product's INCI string, splits + normalizes via algo-derm
// (`splitINCI` + `normalize`), and matches each ingredient name against
// per-cluster substring patterns to emit the `actif_class` product tag
// slugs that apply.
//
// Patterns target canonical INCI fragments (lowercase, after algo-derm
// normalization). Order inside `patterns` doesn't matter; the matcher
// is OR-of-substring. Adding a new pattern = adding a new INCI alias
// the cluster should catch.
//
// Position gating: an actif at position 25+ in INCI is almost never at
// functional concentration (retinol stabilizer trace, AHA used as pH
// adjuster, niacinamide in trace amounts). Each cluster declares a
// `positionCap` — only the first N normalized ingredients are scanned
// for that cluster's patterns. pH-dependent acids (AHA/BHA/PHA), enzymes
// and HA humectants get a tighter cap because functional concentration
// always sits early in the list.

import type { ProductKind } from '@habit-tracker/shared'
import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@habit-tracker/shared'

import { isAlphabeticalINCI, resolveIngredients } from '../lib/ingredient-resolver'

const DEFAULT_POSITION_CAP = 12

// Cleansers/exfoliants/scrubs put surfactants and humectants first; pH-driven
// actives (AHA/BHA/PHA) sit further down (pos 12-18 typical) but at functional
// concentration. Use the looser cap for these kinds.
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
  // Top-N INCI position to scan. Below default if the actif must be at
  // functional concentration to count (acids, enzymes, humectants).
  positionCap?: number
  // Override cap for cleansers/exfoliants where actives sit deeper.
  positionCapRinseOff?: number
}

export const ACTIF_CLASS_DEFS: ActifClassDef[] = [
  {
    slug: SKINCARE_PRODUCT_TAG_SLUGS.RETINOIDS,
    // Vit-A derivatives dosed 0.01-1 % — encapsulated/stabilized forms
    // sit deep in INCI (only_db median pos 26, p90 39). Cap removed to
    // align with manual corpus. Pattern list already covers every variant
    // observed in the corpus (retinol/retinal/retinyl X/retinoate +
    // synthetic retinoids). `bakuchiol` and `beta-carotene` excluded —
    // both are functional retinol alternatives but not chemically vit-A.
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
    // Vit-C esters dosed at trace (oxidation-prone, formulators stabilize
    // at sub-1 % deep in the formula — only_db median pos 25, p90 40).
    // Cap removed to align with manual corpus. Pattern list covers every
    // variant observed (ascorbic acid + 8 esters); substring matching
    // catches `3-O-ethyl ascorbic acid` via `ethyl ascorbic acid` and
    // glommed forms like `vitamin c ester (ascorbyl palmitate)`.
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
      // Marketing INCI: "Vitamin C Ester (Ascorbyl Palmitate)" sometimes
      // gets normalized in a way that drops the parenthetical, leaving
      // `vitamin c ester` as the residual token without `ascorbyl palmitate`
      // matching. Substring catches this edge case.
      'vitamin c ester',
    ],
    positionCap: Number.POSITIVE_INFINITY,
  },
  {
    slug: SKINCARE_PRODUCT_TAG_SLUGS.VITAMIN_E,
    // Vit-E is antioxidant preservative — always sits in the tail of INCI
    // (≤1 % cosmetic dosing). Manual corpus tags it regardless of position;
    // 100 % of only_db drift was past pos 12. Full-scan with no cap aligns
    // the detector with the manual baseline.
    //
    // `tocopheryl` substring catches all esters (acetate / succinate /
    // nicotinate / linoleate / phosphate / glucoside / ferulate / …).
    // `tocopherol` catches free forms (alpha-/beta-/gamma-/delta-/mixed).
    // `tocotrienol` is the vit-E sub-family (rare but functional).
    patterns: ['tocopherol', 'tocopheryl', 'tocotrienol'],
    positionCap: Number.POSITIVE_INFINITY,
  },
  {
    slug: SKINCARE_PRODUCT_TAG_SLUGS.AHA,
    // French variants ("acide X") match products whose INCI was translated
    // FR — common for FR pharmacy / Korean brand FR-localized listings.
    patterns: [
      'glycolic acid',
      'lactic acid',
      'mandelic acid',
      'malic acid',
      'tartaric acid',
      'ammonium lactate',
      'acide glycolique',
      'acide lactique',
      'acide mandelique',
    ],
    // Acids below position 10 are pH adjusters, not exfoliants — except in
    // cleansers/exfoliants where surfactant-heavy formulas push the acid
    // actif to pos 12-18 (CeraVe SA cleanser, Etude House AHA peel gel).
    positionCap: 10,
    positionCapRinseOff: 20,
  },
  {
    slug: SKINCARE_PRODUCT_TAG_SLUGS.BHA,
    patterns: ['salicylic acid', 'acide salicylique', 'betaine salicylate'],
    // Free SA + betaine salicylate (direct salt) at trace concentration
    // (pos > 10 leave-on) is preservative or sub-functional, not
    // exfoliant. Rinse-off cap looser per surfactant displacement.
    positionCap: 10,
    positionCapRinseOff: 20,
  },
  {
    slug: SKINCARE_PRODUCT_TAG_SLUGS.BHA,
    // Capryloyl salicylic acid = Mexoryl-style ester (slow-release,
    // skin-anchored), functional at 0.05-0.1 % and routinely listed
    // pos 13-20 in serums/moisturizers (LRP Effaclar Mat, Abib
    // glutathiosome). No preservative usage → position cap dropped.
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
    // Bio-actives dosed mg-range — manual corpus tags them at any INCI
    // position (only_db median pos 20, p90 38). `lipase` added for
    // multi-enzyme exfoliants (Dermalogica Daily Superfoliant, Prequel
    // Milk Peel) where manual annotation fires but the previous pattern
    // list missed it. `protease` substring catches generic enzyme
    // listings; `papain`/`bromelain`/`subtilisin` cover named variants.
    patterns: ['papain', 'bromelain', 'subtilisin', 'protease', 'lipase'],
    positionCap: Number.POSITIVE_INFINITY,
  },
  {
    slug: SKINCARE_PRODUCT_TAG_SLUGS.CERAMIDES,
    // Stratum-corneum lipids dosed sub-1 % — barrier-repair blends list
    // them deep in the formula (only_db median pos 27, p90 39). Cap
    // removed to align with manual corpus. `ng` and `as` types added
    // (uncommon but observed in cica/relipidant blends). `phytosphingosine`
    // tested but rejected: every manual product containing it also lists
    // a ceramide variant, so it adds 0 to recall but 24 over-tags on
    // soothing/cica products that aren't manually classified as ceramides.
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
    // HA dosed at ≤ 1 % cosmetic — sits in INCI tail but functional as
    // humectant at any position (manual corpus tags it accordingly: 100 %
    // of only_db drift past pos 10, median pos 19, p90 34). The single
    // `hyaluron` substring catches every variant: hyaluronic acid,
    // sodium / potassium / acetylated / hydrolyzed / crosspolymer /
    // dimethylsilanol / hydroxypropyltrimonium hyaluronate, plus UK
    // spelling and ester glommings.
    patterns: ['hyaluron'],
    positionCap: Number.POSITIVE_INFINITY,
  },
  {
    slug: SKINCARE_PRODUCT_TAG_SLUGS.PEPTIDES,
    // Peptides dosed mg-range — always sit in INCI tail (median pos 25 in
    // manual corpus, p90 42) but signaling-active at trace concentration.
    // `peptide` substring catches every chain length (di/tri/tetra/penta/
    // hexa/hepta/octa/nona/deca/oligo/poly) and every acyl prefix
    // (palmitoyl/acetyl/myristoyl). Brand names retained for INCI that
    // list the marketing name instead of the technical one.
    patterns: ['peptide', 'matrixyl', 'argireline', 'syn-ake', 'pdrn'],
    positionCap: Number.POSITIVE_INFINITY,
  },
  {
    slug: SKINCARE_PRODUCT_TAG_SLUGS.POLYPHENOLS,
    // Botanical polyphenol sources dosed at trace (extract %); manual
    // corpus tags them past pos 12 (median 22, p90 35). Broadened
    // patterns drop the `leaf extract` qualifier on `camellia sinensis`
    // (catches seed oil too — manual baseline tags both forms) and add
    // `vitis vinifera` (grape — top-8 missed variant). Full-scan cap
    // matches manual annotation regardless of position.
    patterns: [
      'resveratrol',
      'epigallocatechin',
      'ferulic acid',
      // Ferulic acid esters (ethylhexyl/ethyl ferulate) used as
      // oil-soluble antioxidants in modern serums; same polyphenol
      // pharmacophore, missed by `ferulic acid` substring.
      'ferulate',
      'camellia sinensis',
      'curcuma longa',
      'rosmarinus officinalis',
      'punica granatum',
      'polygonum cuspidatum',
      'cistus monspeliensis',
      'quercetin',
      'vitis vinifera',
      'melissa officinalis',
      // Milk thistle: `silybum marianum` (plant) + `silymarin`
      // (standardized flavonolignan complex, alt INCI form).
      'silybum marianum',
      'silymarin',
    ],
    positionCap: Number.POSITIVE_INFINITY,
  },
  {
    slug: SKINCARE_PRODUCT_TAG_SLUGS.TYROSINASE_INHIBITORS,
    // Pigmentation-targeted actives dosed sub-1 % — manual corpus tags
    // them at any INCI position (only_db median 18, p90 33). Cap removed.
    // Pattern list extended with competitive binders (`undecylenoyl
    // phenylalanine` = Sepiwhite/melanostatin) and resorcinol-family
    // (`hexylresorcinol`). `arbutin` substring catches `alpha-arbutin`
    // and `deoxyarbutin`.
    //
    // Excluded by mechanism mismatch / over-broadening:
    // - `glycyrrhiza` / `glycyrrhizate` (licorice extract) — ubiquitous
    //   soothing/cica ingredient (+401 over-tags); only pigmentation when
    //   combined with kojic/arbutin/morus alba (already caught).
    // - `niacinamide` — inhibits melanosome transfer, not tyrosinase;
    //   would over-broaden the cluster to most niacinamide products.
    patterns: [
      'kojic acid',
      'arbutin',
      'tranexamic acid',
      // French INCI translation (Korean serum lines available in FR market).
      'acide tranexamique',
      'ellagic acid',
      'morus alba',
      'undecylenoyl phenylalanine',
      'hexylresorcinol',
      // Mela B3 patented anti-pigment actif (La Roche-Posay) — direct
      // tyrosinase pathway inhibitor, not over-broad.
      '2-mercaptonicotinoyl glycine',
      // Boldine (diacetyl boldine = Lumiskin) — competitive tyrosinase
      // inhibitor used in serums anti-taches.
      'boldine',
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
  // Defensive filter — hoisted callers control the array shape; protect
  // against an upstream that includes empty tokens.
  const ingredients = resolved.filter(Boolean)
  if (ingredients.length === 0) return []

  // Korean brands often list INCI alphabetically — position-based caps then
  // mean nothing. Detect once and bypass position gating per cluster.
  const isAlpha = isAlphabeticalINCI(ingredients)
  const isRinseOffLike = kind !== undefined && RINSE_OFF_LIKE_KINDS.has(kind)

  const found = new Set<SkincareProductTagSlug>()
  for (const def of ACTIF_CLASS_DEFS) {
    const baseCap =
      isRinseOffLike && def.positionCapRinseOff !== undefined
        ? def.positionCapRinseOff
        : (def.positionCap ?? DEFAULT_POSITION_CAP)
    const cap = isAlpha ? ingredients.length : Math.min(ingredients.length, baseCap)
    const window = ingredients.slice(0, cap)
    if (def.patterns.some((p) => window.some((ing) => ing.includes(p)))) {
      found.add(def.slug)
    }
  }
  return [...found]
}
