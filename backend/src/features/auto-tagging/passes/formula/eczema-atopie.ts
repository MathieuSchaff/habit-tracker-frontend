import type { ProductKind } from '@aurore/shared'
import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { resolveIngredients } from '../../lib/ingredient-resolver'

const S = SKINCARE_PRODUCT_TAG_SLUGS

import { IONIC_SURFACTANT_PATTERNS } from './step-nettoyage-1'

// Eczema-atopie
// UNWIRED from the registry (2026-05-26): the oat/ceramide signal scored
// P=0.000 against the locked gold criterion (present iff name/desc *names* atopy)
// — signature mismatch, it tags a barrier-friendly/relipidant population, not the
// named-atopic shelf. `eczema-atopie` now emits only from name (detectEczemaAtopieFromName
// below). Kept here for reuse by a future barrier-support / relipidant tag; do
// not re-wire to eczema-atopie. Open question (backlog): does eczema-atopie mean
// "marketed-for atopy" (current) or "suitable-for atopic skin"?
//
// Atopic-friendly formula. Two triggers:
//   A) `avena sativa kernel` anywhere in INCI — colloidal oatmeal (kernel
//      flour / kernel extract / kernel oil) is the FDA-recognized OTC skin
//      protectant for eczema (avenanthramides + beta-glucans). `avena sativa
//      flower/leaf/stem juice` is excluded: different botanical part, not
//      OTC-recognized, common as a generic soothing actif in non-AD products.
//   B) ≥ 2 distinct ceramide variants in top 12 AND 0 fragrance keyword AND
//      0 ionic sulfate surfactant in top 5. Single ceramide is hydration
//      polish; pairs target stratum-corneum lipid replenishment (CeraVe,
//      Avène Tolerance, La Roche-Posay Lipikar). Fragrance is the most-cited
//      AD flare trigger — exclude any `parfum`/`fragrance`/`aroma` declaration.
//      Sulfates are barrier-disrupting on AD-prone skin.
//
// Leave-on only: rinse-off contact time too short for either pathway to matter
// (Lodén 2003 on cumulative surfactant exposure; oat OTC label requires
// "leave on the affected area" usage).
//
// Replaces algo-derm `peaux_atopiques` mapping (fired on 22 % corpus / 3 %
// agree, too permissive). The algo-derm slug has no TAG_CONFIG entry — its
// candidate is dropped as `unmapped`. Original detector landed in f3fd5e2f;
// split into passes/formula/ at 211219d5.

const ATOPIE_OAT_PATTERN = 'avena sativa kernel'

// Mirror actif-class CERAMIDES patterns (single source of truth would import
// ACTIF_CLASS_DEFS, but coupling is heavier than the duplication cost — these
// patterns are stable taxonomy). Keep aligned with actif-class-detection.ts.
const ATOPIE_CERAMIDE_PATTERNS = [
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
]

// Functional concentration: ceramides past pos 12 are dosage trace, not the
// CeraVe-style relipidant claim eczema-friendly formulas are built around.
const ATOPIE_CERAMIDE_POSITION_CAP = 12

// Substring match: the slash-form `PARFUM/FRAGRANCE` normalizes to a single
// `parfum fragrance` token (algo-derm parser collapses `/` to space), which
// would slip past an exact-match check. `aroma` substring carries minimal
// FP risk — no common INCI ingredient embeds it as a substring.
const ATOPIE_FRAGRANCE_PATTERNS = ['parfum', 'fragrance', 'aroma']

const ATOPIE_SULFATE_POSITION_CAP = 5

const ATOPIE_RINSE_OFF_KINDS = new Set<ProductKind>([
  'cleanser',
  'shampoo',
  'conditioner',
  'body-wash',
  'body-scrub',
  'mouthwash',
])

export function detectEczemaAtopie(
  inci: string | null | undefined,
  kind: ProductKind,
  hoistedIngredients?: readonly string[]
): SkincareProductTagSlug[] {
  if (ATOPIE_RINSE_OFF_KINDS.has(kind)) return []
  const ingredients = resolveIngredients(inci, hoistedIngredients)
  if (ingredients.length === 0) return []

  // Trigger A: oatmeal anywhere → atopie-friendly regardless of other actifs
  if (ingredients.some((ing) => ing.includes(ATOPIE_OAT_PATTERN))) {
    return [S.ECZEMA_ATOPIE]
  }

  // Trigger B: ceramide relipidant pair + fragrance-free + no sulfate top 5
  const ceramideCap = Math.min(ingredients.length, ATOPIE_CERAMIDE_POSITION_CAP)
  let ceramideHits = 0
  for (let i = 0; i < ceramideCap; i++) {
    if (ATOPIE_CERAMIDE_PATTERNS.some((p) => ingredients[i].includes(p))) {
      ceramideHits++
      if (ceramideHits >= 2) break
    }
  }
  if (ceramideHits < 2) return []

  if (ingredients.some((ing) => ATOPIE_FRAGRANCE_PATTERNS.some((p) => ing.includes(p)))) {
    return []
  }

  const sulfateCap = Math.min(ingredients.length, ATOPIE_SULFATE_POSITION_CAP)
  for (let i = 0; i < sulfateCap; i++) {
    if (IONIC_SURFACTANT_PATTERNS.some((p) => ingredients[i].includes(p))) return []
  }

  return [S.ECZEMA_ATOPIE]
}

// Additive recall pass: the INCI detector above keys on oat/ceramide chemistry
// and misses the named atopic shelf (Atoderm/Xeracalm/Xémose…), which carries no
// reliable INCI signal. Matches "atopi" / "eczéma" / "eczema" (EN) in name OR
// description — EU-regulated claims (cosmetic→medical-device borderline) brands
// use only when genuinely positioned for atopy. High precision in BOTH fields:
// negation/differential-diagnosis prose ("déconseillé aux peaux atopiques", "à
// différencier d'une dermatite atopique") lives only in ingredient/article copy,
// never in products.description, so it never reaches this function. Snapshot-bound
// hit/FP counts: sessions/2026-05-25-gold-eczema-atopie-pilot.md. Latent
// gap: a future description that contraindicates atopy would false-positive here
// — withheld by partitionEczemaReview at every detectAllAutoTags write/audit
// consumer (negation+atopy → manual review, not auto-tag) rather than by gating
// this regex, which would drop the positive forms. Lipikar-style broad brand lines excluded (span non-atopy
// SKUs). No kind gate: an atopy-named cleanser is still atopy-positioned.
const ATOPIE_NAME_RE = /atopi|ecz[ée]ma/i

export function detectEczemaAtopieFromName(
  name: string | null | undefined,
  description: string | null | undefined
): SkincareProductTagSlug[] {
  if (ATOPIE_NAME_RE.test(name ?? '') || ATOPIE_NAME_RE.test(description ?? '')) {
    return [S.ECZEMA_ATOPIE]
  }
  return []
}

// Contraindication cues that invert the atopy signal: a description naming atopy
// alongside one of these positions AGAINST atopic skin, not for it. `psoriasis`
// and other co-indication terms are deliberately absent — "soulage eczéma/
// psoriasis" is a positive claim. This is a forward sentinel for the ingest
// pipeline, not a live filter on the detector above.
const ATOPIE_CONTRAINDICATION_RE =
  /non recommand|déconseill|ne pas (utiliser|appliquer)|contre-indiqu|à différenc|ne convient pas|éviter (sur|en cas|le contour)/i

// True when a description names atopy under a contraindication — the latent FP
// case detectEczemaAtopieFromName cannot distinguish. The ingest pipeline routes
// these to manual review instead of auto-tagging eczema-atopie, preserving recall
// on the positive forms (no regex gating).
export function eczemaAtopieDescriptionNeedsReview(
  description: string | null | undefined
): boolean {
  // Require the atopy token and the contraindication cue in the SAME sentence:
  // a boilerplate caveat ("éviter le contour des yeux") in its own sentence,
  // next to a positive atopy claim, must not trip the sentinel. Split on
  // sentence boundaries only — not commas, so "déconseillé, aux peaux
  // atopiques" still counts as one contraindicating clause.
  const sentences = (description ?? '').split(/[.;!\n]+/)
  return sentences.some((s) => ATOPIE_NAME_RE.test(s) && ATOPIE_CONTRAINDICATION_RE.test(s))
}

// Single withholding point shared by every detectAllAutoTags consumer that
// writes or audits tags (live product service, seed-core, backfill, reconcile).
// Pulls the eczema-atopie pair when the description contraindicates atopy and
// flips `withheld` so batch callers can surface the product for manual review.
// Lives here, not at each call site, so the live intake path cannot drift out of
// sync with the runners.
export function partitionEczemaReview<T extends { tagSlug: SkincareProductTagSlug }>(
  pairs: readonly T[],
  description: string | null | undefined
): { kept: readonly T[]; withheld: boolean } {
  if (!eczemaAtopieDescriptionNeedsReview(description)) {
    return { kept: pairs, withheld: false }
  }
  const kept = pairs.filter((p) => p.tagSlug !== S.ECZEMA_ATOPIE)
  return { kept, withheld: kept.length !== pairs.length }
}
