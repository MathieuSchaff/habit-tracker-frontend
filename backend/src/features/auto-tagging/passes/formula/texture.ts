import type { ProductKind, ProductTexture } from '@aurore/shared'
import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { resolveIngredients } from '../../lib/ingredient-resolver'
import { inciWindow } from './pass-helpers'

const S = SKINCARE_PRODUCT_TAG_SLUGS

import { IONIC_SURFACTANT_PATTERNS } from './step-nettoyage-1'

// ≥ 2 butters / waxes in top 8: signals a heavy, balm-ish texture. One butter
// alone is usually a texture polish; two means the formula is butter-driven.

const BUTTER_WAX_PATTERNS = [
  'butyrospermum parkii', // shea butter
  'shea butter',
  'mangifera indica', // mango butter
  'mango butter',
  'theobroma cacao', // cocoa butter
  'cocoa butter',
  'cera alba', // beeswax
  'beeswax',
  'cera carnauba',
  'carnauba wax',
  'copernicia cerifera',
  'candelilla wax',
  'euphorbia cerifera', // candelilla wax by INCI botanical name
  'cera microcristallina',
  'microcrystalline wax',
  'cocoa seed butter',
]

const TEXTURE_RICHE_POSITION_CAP = 8

export function detectTextureRiche(
  inci: string | null | undefined,
  hoistedIngredients?: readonly string[]
): SkincareProductTagSlug[] {
  const ingredients = resolveIngredients(inci, hoistedIngredients)
  if (ingredients.length === 0) return []
  // Each pattern can only count once (avoid 'butyrospermum parkii' + 'shea butter'
  // double-counting on a single ingredient that contains both substrings).
  const matchedPatterns = new Set<string>()
  for (const ing of inciWindow(ingredients, TEXTURE_RICHE_POSITION_CAP)) {
    for (const p of BUTTER_WAX_PATTERNS) {
      if (matchedPatterns.has(p)) continue
      if (ing.includes(p)) {
        matchedPatterns.add(p)
        break
      }
    }
  }

  // Synonym dedup: if both 'butyrospermum parkii' and 'shea butter' matched (same
  // ingredient), still only one butter. Group by canonical name.
  const canonicalGroups: Array<readonly string[]> = [
    ['butyrospermum parkii', 'shea butter'],
    ['mangifera indica', 'mango butter'],
    ['theobroma cacao', 'cocoa butter', 'cocoa seed butter'],
    ['cera alba', 'beeswax'],
    ['cera carnauba', 'carnauba wax', 'copernicia cerifera'],
    ['candelilla wax', 'euphorbia cerifera'],
    ['cera microcristallina', 'microcrystalline wax'],
  ]
  let groupHits = 0
  for (const group of canonicalGroups) {
    if (group.some((p) => matchedPatterns.has(p))) groupHits++
  }
  const groupedSynonyms = new Set(canonicalGroups.flat())
  for (const p of matchedPatterns) {
    if (!groupedSynonyms.has(p)) groupHits++
  }

  return groupHits >= 2 ? [S.TEXTURE_RICHE] : []
}

// Hoisted above texture-legere/non-gras so multiple detectors can compose them.
// Aligned with algo-derm `silicone` heuristic (data/rules/heuristic_rules.json).
// Excluded: 'amodimethicone' (haircare only), 'siloxane'/'silanol' (too broad, over-tags end-group variants).
// When the orchestrator hoists `assessment.heuristicFlags`, replace with `flags.has('silicone')` (audit §C.1, B.4).
const SILICONE_LIGHT_PATTERNS = [
  'dimethicone',
  'dimethiconol',
  'cyclopentasiloxane',
  'cyclomethicone',
  'cyclohexasiloxane',
  'isohexadecane',
  'phenyl trimethicone',
  'trimethylsiloxysilicate',
]

const VEGETABLE_OIL_PATTERNS = [
  'olea europaea',
  'helianthus annuus',
  'simmondsia chinensis',
  'argania spinosa',
  'macadamia',
  'cocos nucifera',
  'persea gratissima',
  'prunus amygdalus',
  'prunus armeniaca',
  'glycine soja',
  'oryza sativa bran oil',
  // Camellia leaf/flower extract and water are light hydrosols/extracts;
  // only the oil/seed forms count as heavy. Match the oil-producing botanical
  // names + "oil" suffix to avoid excluding green-tea hydrosol formulas.
  'camellia japonica seed oil',
  'camellia oleifera seed oil',
  'camellia sinensis seed oil',
  'rosa canina',
  'rosa rubiginosa',
  'vitis vinifera seed oil',
  'mineral oil',
  'paraffinum liquidum',
]

// Light, watery feel: water or glycerin in top 3, no butter/wax/petrolatum/
// vegetable-oil in top 8, leave-on only. Vegetable oils excluded so an oil-
// driven emulsion is not double-tagged with `texture-creme` (F2 mutex).

const WATER_TOKENS = ['aqua', 'water', 'eau']
const HEAVY_EXCLUSION_PATTERNS = [
  ...BUTTER_WAX_PATTERNS,
  ...VEGETABLE_OIL_PATTERNS,
  'petrolatum',
  'lanolin',
]

const TEXTURE_LEGERE_RINSE_OFF = new Set<ProductKind>([
  'balm', // balms are inherently rich, never light
  'cleanser',
  'body-wash',
  'body-scrub',
  'mask',
])

export function detectTextureLegere(
  inci: string | null | undefined,
  kind: ProductKind,
  hoistedIngredients?: readonly string[]
): SkincareProductTagSlug[] {
  if (TEXTURE_LEGERE_RINSE_OFF.has(kind)) return []
  const ingredients = resolveIngredients(inci, hoistedIngredients)
  if (ingredients.length < 3) return []

  const top3 = inciWindow(ingredients, 3)
  const hasLightBase =
    top3.some((ing) => WATER_TOKENS.some((t) => ing.includes(t))) ||
    top3.some((ing) => ing.includes('glycerin'))
  if (!hasLightBase) return []

  for (const ing of inciWindow(ingredients, 8)) {
    if (HEAVY_EXCLUSION_PATTERNS.some((p) => ing.includes(p))) return []
  }

  return [S.TEXTURE_LEGERE]
}

// Silicone in top 5, no vegetable oil in top 5. `absorption-rapide` was
// previously co-emitted but dropped: same INCI signal, marketing-style duplicate.

const NON_GRAS_KINDS = new Set<ProductKind>(['serum', 'eye-cream'])

export function detectNonGras(
  inci: string | null | undefined,
  kind: ProductKind,
  hoistedIngredients?: readonly string[]
): SkincareProductTagSlug[] {
  if (!NON_GRAS_KINDS.has(kind)) return []
  const ingredients = resolveIngredients(inci, hoistedIngredients)
  if (ingredients.length === 0) return []
  const top5 = inciWindow(ingredients, 5)

  const hasLightSilicone = top5.some((ing) => SILICONE_LIGHT_PATTERNS.some((p) => ing.includes(p)))
  if (!hasLightSilicone) return []

  for (const ing of top5) {
    if (VEGETABLE_OIL_PATTERNS.some((p) => ing.includes(p))) return []
  }

  return [S.NON_GRAS]
}

// Admin-curated `products.texture` field: authoritative over INCI fallbacks.

const TEXTURE_FIELD_TO_SLUG: Record<ProductTexture, SkincareProductTagSlug> = {
  gel: S.TEXTURE_GEL,
  creme: S.TEXTURE_CREME,
  mousse: S.TEXTURE_MOUSSE,
  stick: S.TEXTURE_STICK,
  huile: S.TEXTURE_HUILE,
  lait: S.TEXTURE_LAIT,
  eau: S.TEXTURE_EAU,
  baume: S.TEXTURE_BAUME,
  patch: S.TEXTURE_PATCH,
}

export function detectTextureFromField(
  texture: ProductTexture | null | undefined
): SkincareProductTagSlug[] {
  if (!texture) return []
  const slug = TEXTURE_FIELD_TO_SLUG[texture]
  return slug ? [slug] : []
}

// INCI fallback for gel texture (no admin-curated field): gel-former in top 5,
// no oily/heavy/silicone base. Precision-focused: easier to miss a gel than to
// mislabel a cream as gel.
// `mousse` and `stick` have no INCI fallback: foaming surfactants can't
// distinguish a foam-pump mousse from a liquid cleanser, and stick chemistry
// (wax-heavy) overlaps with `baume` without a reliable INCI marker.

const GEL_FORMER_PATTERNS = [
  'carbomer',
  'xanthan',
  'sodium polyacrylate',
  'hydroxyethylcellulose',
  'hydroxyethyl cellulose',
  'sclerotium gum',
  // Pemulen: also positions as gel-cream stabiliser, but in top 5 the gel
  // texture dominates (used at 0.2-0.5 % only when its rheology is the point).
  'acrylates/c10-30 alkyl acrylate crosspolymer',
  'ammonium acryloyldimethyltaurate',
]

// Rinse-off and oil/balm kinds excluded: "gel cleanser" is a packaging label,
// not a leave-on texture. Balm and oil contradict gel by chemistry.
const TEXTURE_GEL_INCI_SKIP_KINDS = new Set<ProductKind>([
  'cleanser',
  'body-wash',
  'body-scrub',
  'balm',
  'oil',
  'body-oil',
  'hair-oil',
  'patch',
])

const TEXTURE_GEL_POSITION_CAP = 5

export function detectTextureGelInci(
  inci: string | null | undefined,
  kind: ProductKind,
  texture: ProductTexture | null | undefined,
  hoistedIngredients?: readonly string[]
): SkincareProductTagSlug[] {
  if (texture) return []
  if (TEXTURE_GEL_INCI_SKIP_KINDS.has(kind)) return []
  const ingredients = resolveIngredients(inci, hoistedIngredients)
  if (ingredients.length === 0) return []

  const top5 = inciWindow(ingredients, TEXTURE_GEL_POSITION_CAP)
  const hasGelFormer = top5.some((ing) => GEL_FORMER_PATTERNS.some((p) => ing.includes(p)))
  if (!hasGelFormer) return []

  for (const ing of top5) {
    if (VEGETABLE_OIL_PATTERNS.some((p) => ing.includes(p))) return []
  }

  for (const ing of inciWindow(ingredients, 8)) {
    if (BUTTER_WAX_PATTERNS.some((p) => ing.includes(p))) return []
  }

  // No silicone-led "gel-cream" hybrid (covered by `non-gras`/`semi-occlusif`).
  for (const ing of top5) {
    if (SILICONE_LIGHT_PATTERNS.some((p) => ing.includes(p))) return []
  }

  return [S.TEXTURE_GEL]
}

// Default for kinds where cream is the expected format. Eye-cream excluded:
// too heterogeneous (patches, gels, serums, real creams) for a kind-based default.
//
// Vetos (any → skip):
//   1. Ionic surfactant top 5 → cleanser mistag.
//   2. ≥ 2 butter/wax top 8 → defer to `texture-riche`.
//   3. Vegetable oil or butter/wax at pos 1 → face-oil mistag.
//   4. No water in top 5 → oil-led formula.
//   5. Gel-former top 5 + no oily phase top 8 → `texture-gel` wins.
//   6. Water at pos 1 + no emulsifier top 8 + no oily phase → serum/essence.
//
// Below TEXTURE_CREME_MIN_INCI_FOR_VETO, vetos are unreliable, trust kind.
// Mutex with `texture-legere` enforced via VEGETABLE_OIL_PATTERNS in HEAVY_EXCLUSION_PATTERNS.

const TEXTURE_CREME_DEFAULT_KINDS = new Set<ProductKind>(['moisturizer', 'foot-cream'])

// O/W emulsifiers and co-emulsifiers commonly seen at top 8 in a cream phase.
// Includes fatty alcohols (cetearyl/cetyl/stearyl/behenyl), glyceryl/sorbitan
// stearates, PEG/steareth/ceteareth ethoxylates, polysorbates, glucoside-
// based natural emulsifiers, and polymeric emulsifiers (polyacrylate-13,
// Sepiplus family). Hyphen on `polyacrylate-13` to avoid matching the gel
// thickener `sodium polyacrylate`.
const EMULSIFIER_PATTERNS = [
  'cetearyl alcohol',
  'cetyl alcohol',
  'stearyl alcohol',
  'behenyl alcohol',
  'arachidyl alcohol',
  'glyceryl stearate',
  'cetyl palmitate',
  'peg-100 stearate',
  'peg-40 stearate',
  'peg-20 stearate',
  'sorbitan stearate',
  'sorbitan olivate',
  'cetearyl olivate',
  'cetearyl glucoside',
  'arachidyl glucoside',
  'methyl glucose sesquistearate',
  'polysorbate',
  'ceteareth-',
  'steareth-',
  'lecithin',
  'polyacrylate-13',
]

// Esters and synthetic emollients that count as oily phase even when no
// vegetable oil / butter / silicone is in top 8. Keeps the detector firing on
// cream formulas built around lighter ester phases (e.g. SVR Xerial, Embryolisse).
const CREAM_OILY_EXTRA_PATTERNS = [
  'caprylic capric triglyceride',
  'octyldodecanol',
  'cetearyl ethylhexanoate',
  'isopropyl palmitate',
  'c12-15 alkyl benzoate',
  'coco-caprylate',
  'dicaprylyl carbonate',
  'ethylhexyl palmitate',
  'ethylhexyl cocoate',
  'hydrogenated coco-glycerides',
  'hydrogenated polyisobutene',
  'squalane',
]

// Below this threshold, INCI is too sparse for reliable veto decisions.
const TEXTURE_CREME_MIN_INCI_FOR_VETO = 4

export function detectTextureCremeInci(
  inci: string | null | undefined,
  kind: ProductKind,
  texture: ProductTexture | null | undefined,
  hoistedIngredients?: readonly string[]
): SkincareProductTagSlug[] {
  if (texture) return []
  if (!TEXTURE_CREME_DEFAULT_KINDS.has(kind)) return []

  const ingredients = resolveIngredients(inci, hoistedIngredients)

  // Veto logic unreliable on sparse INCI: trust kind.
  if (ingredients.length < TEXTURE_CREME_MIN_INCI_FOR_VETO) return [S.TEXTURE_CREME]

  const top5 = inciWindow(ingredients, 5)
  const top8 = inciWindow(ingredients, 8)
  const firstIng = ingredients[0]

  // Veto 1: ionic surfactant top 5 → cleanser mistag
  if (top5.some((ing) => IONIC_SURFACTANT_PATTERNS.some((p) => ing.includes(p)))) return []

  // Veto 2: ≥ 2 distinct butter/wax top 8 → texture-riche wins
  const butterWaxCount = top8.filter((ing) =>
    BUTTER_WAX_PATTERNS.some((p) => ing.includes(p))
  ).length
  if (butterWaxCount >= 2) return []

  // Veto 3: vegetable oil or butter/wax at pos 1 → face-oil mistag
  if (
    VEGETABLE_OIL_PATTERNS.some((p) => firstIng.includes(p)) ||
    BUTTER_WAX_PATTERNS.some((p) => firstIng.includes(p))
  )
    return []

  // Veto 4: no water in top 5 → oil-led formula
  if (!top5.some((ing) => WATER_TOKENS.some((t) => ing.includes(t)))) return []

  const hasOilyPhase = top8.some(
    (ing) =>
      BUTTER_WAX_PATTERNS.some((p) => ing.includes(p)) ||
      VEGETABLE_OIL_PATTERNS.some((p) => ing.includes(p)) ||
      SILICONE_LIGHT_PATTERNS.some((p) => ing.includes(p)) ||
      CREAM_OILY_EXTRA_PATTERNS.some((p) => ing.includes(p)) ||
      ing.includes('petrolatum') ||
      ing.includes('lanolin')
  )

  // Veto 5: gel-former top 5 + no oily phase top 8 → texture-gel wins
  if (top5.some((ing) => GEL_FORMER_PATTERNS.some((p) => ing.includes(p))) && !hasOilyPhase)
    return []

  // Veto 6: water at pos 1 + no emulsifier top 8 + no oily phase → serum/essence
  if (
    WATER_TOKENS.some((t) => firstIng.includes(t)) &&
    !top8.some((ing) => EMULSIFIER_PATTERNS.some((p) => ing.includes(p))) &&
    !hasOilyPhase
  )
    return []

  return [S.TEXTURE_CREME]
}

// Name-based texture hint for eye-cream: INCI alone is insufficient (sparse or
// conflicting). Priority: abstain > baume > gel > creme > null.
//   'abstain': definitively not a leave-on cream (serum, patch, ampoule, etc.)
//   'baume'/'gel': conflict with INCI gate, defer to admin curation
//   'creme': name confirms cream, fires on sparse INCI
//   null: INCI gate is authoritative

type EyeCreamTextureHint = 'creme' | 'baume' | 'gel' | 'abstain' | null

const EYE_CREAM_ABSTAIN_RE =
  /\b(patch|hydrogel|masque|eye\s+mask|eye\s+patch|s[eé]rum|ampoule|ampouler|pencil|liner|eyeliner|fluide|fluid|essence|lotion)\b/i
const EYE_CREAM_BAUME_RE = /\b(baume|balm|ointment)\b/i
const EYE_CREAM_GEL_RE = /\bgel\b/i
const EYE_CREAM_CREME_RE = /\b(cr[eè]me|cream)\b/i

function textureHintFromName(name: string | null | undefined): EyeCreamTextureHint {
  if (!name?.trim()) return null
  if (EYE_CREAM_ABSTAIN_RE.test(name)) return 'abstain'
  if (EYE_CREAM_BAUME_RE.test(name)) return 'baume'
  if (EYE_CREAM_GEL_RE.test(name)) return 'gel'
  if (EYE_CREAM_CREME_RE.test(name)) return 'creme'
  return null
}

// Texture-creme for eye-cream: excluded from the F2 kind-based default because
// eye-cream spans patches, hydrogels, serums and real creams. Uses name hint +
// INCI gate (water top 3 + emulsifier top 8). If gate passes but name signals
// baume or gel, defer to admin curation.
//
// Vetos (subset of F2):
//   1. Ionic surfactant top 5 → cleanser mistag.
//   2. ≥ 2 butter/wax top 8 → defer to `texture-riche`.
//   3. Gel-former top 5 → `texture-gel` wins.

export function detectTextureCremeEyeInci(
  inci: string | null | undefined,
  kind: ProductKind,
  texture: ProductTexture | null | undefined,
  name?: string | null,
  hoistedIngredients?: readonly string[]
): SkincareProductTagSlug[] {
  if (texture) return []
  if (kind !== 'eye-cream') return []

  const hint = textureHintFromName(name)

  // Name says serum / patch / ampoule / etc. → skip regardless of INCI
  if (hint === 'abstain') return []

  const ingredients = resolveIngredients(inci, hoistedIngredients)

  // Sparse or absent INCI: require name to confirm cream (unsafe to trust kind
  // alone; eye-cream kind includes patches, gels, serums, hydrogels).
  if (ingredients.length < TEXTURE_CREME_MIN_INCI_FOR_VETO) {
    return hint === 'creme' ? [S.TEXTURE_CREME] : []
  }

  const top3 = inciWindow(ingredients, 3)
  const top5 = inciWindow(ingredients, 5)
  const top8 = inciWindow(ingredients, 8)

  // Veto 1: ionic surfactant top 5 → cleanser mistag
  if (top5.some((ing) => IONIC_SURFACTANT_PATTERNS.some((p) => ing.includes(p)))) return []

  // Veto 2: ≥ 2 distinct butter/wax top 8 → texture-riche wins
  const butterWaxCount = top8.filter((ing) =>
    BUTTER_WAX_PATTERNS.some((p) => ing.includes(p))
  ).length
  if (butterWaxCount >= 2) return []

  // Veto 3: gel-former top 5 → texture-gel wins
  if (top5.some((ing) => GEL_FORMER_PATTERNS.some((p) => ing.includes(p)))) return []

  if (!top3.some((ing) => WATER_TOKENS.some((t) => ing.includes(t)))) return []
  if (!top8.some((ing) => EMULSIFIER_PATTERNS.some((p) => ing.includes(p)))) return []

  // INCI gate passes but name signals a conflicting texture → defer to admin
  if (hint === 'baume' || hint === 'gel') return []

  return [S.TEXTURE_CREME]
}

// `balm` kind already gets `texture-baume` via kind-tag detection.
// Eye-cream and moisturizer don't: they cover heterogeneous ranges. Name-driven
// fallback (F6 Q3) because butter/wax INCI thresholds don't generalise to
// leave-on balms with mixed phases. Only fires when `products.texture` is unset.

const TEXTURE_BAUME_NAME_KINDS = new Set<ProductKind>(['eye-cream', 'moisturizer'])

// Guards against `moisturizer`-typed products whose name reveals a different
// category: "Baume Lavant", "Baume Lèvres", "Baume Après-Rasage", "Douche Baume".
// `levers` is a recurrent typo of "lèvres" in the Eucerin corpus.
const TEXTURE_BAUME_NAME_VETO_RE = /\b(lavant|douche|l[èe]vres?|levers?|lip|rasage)\b/i

export function detectTextureBaumeFromName(
  kind: ProductKind,
  texture: ProductTexture | null | undefined,
  name?: string | null
): SkincareProductTagSlug[] {
  if (texture) return []
  if (!TEXTURE_BAUME_NAME_KINDS.has(kind)) return []
  const n = name ?? ''
  if (!EYE_CREAM_BAUME_RE.test(n)) return []
  if (TEXTURE_BAUME_NAME_VETO_RE.test(n)) return []
  return [S.TEXTURE_BAUME]
}

// `texture-stick` is non-derivable from INCI alone: wax-stick chemistry overlaps
// balm/sunscreen without a reliable INCI marker. Name-driven fallback when
// `products.texture` is unset. Leave-on kinds only: sun sticks land in
// `moisturizer`/`sunscreen`, corrector sticks in `spot-treatment`.

const TEXTURE_STICK_NAME_KINDS = new Set<ProductKind>([
  'lip-care',
  'balm',
  'moisturizer',
  'spot-treatment',
  'sunscreen',
])

const TEXTURE_STICK_NAME_RE = /\b(stick|b[âa]ton)\b/i

// Compound product veto: "Crème Mains + Stick Lèvres" = duo, the primary
// product isn't a stick. SPF50+ / PA++++ are not vetoed (no whitespace +
// product term after the +).
const TEXTURE_STICK_NAME_VETO_RE = /\+\s+(stick|b[âa]ton)\b/i

export function detectTextureStickFromName(
  kind: ProductKind,
  texture: ProductTexture | null | undefined,
  name?: string | null
): SkincareProductTagSlug[] {
  if (texture) return []
  if (!TEXTURE_STICK_NAME_KINDS.has(kind)) return []
  const n = name ?? ''
  if (!TEXTURE_STICK_NAME_RE.test(n)) return []
  if (TEXTURE_STICK_NAME_VETO_RE.test(n)) return []
  return [S.TEXTURE_STICK]
}
