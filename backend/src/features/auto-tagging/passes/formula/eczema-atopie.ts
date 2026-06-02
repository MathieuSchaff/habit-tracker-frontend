import type { ProductKind } from '@aurore/shared'
import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { resolveIngredients } from '../../lib/ingredient-resolver'

const S = SKINCARE_PRODUCT_TAG_SLUGS

import { IONIC_SURFACTANT_PATTERNS } from './step-nettoyage-1'

// UNWIRED from the registry (2026-05-26): the oat/ceramide signal scored P=0.000
// against the locked gold criterion (present iff name/desc names atopy): signature
// mismatch: it tags a barrier-friendly/relipidant population, not the named-atopic
// shelf. eczema-atopie now emits only from detectEczemaAtopieFromName below.
// Kept for reuse by a future barrier-support/relipidant tag; do not re-wire to eczema-atopie.
// Open question (backlog): "marketed-for atopy" (current) vs "suitable-for atopic skin"?
//
// Atopic-friendly formula detector. Two triggers:
//   A) avena sativa kernel anywhere in INCI: FDA-recognized OTC skin protectant
//      (avenanthramides + beta-glucans). avena sativa flower/leaf/stem juice excluded:
//      different botanical part, not OTC-recognized.
//   B) >= 2 distinct ceramide variants in top 12, no fragrance keyword, no ionic
//      sulfate in top 5. Single ceramide = hydration polish; pairs = stratum-corneum
//      lipid replenishment (CeraVe, Avene Tolerance, La Roche-Posay Lipikar).
//      Fragrance is the most-cited AD flare trigger. Sulfates disrupt barrier.
//
// Leave-on only: rinse-off contact time too short (Lodén 2003; oat OTC label
// requires "leave on the affected area").
//
// Replaces algo-derm peaux_atopiques (22 % corpus / 3 % agree). The algo-derm
// slug has no TAG_CONFIG entry and drops as unmapped.

const ATOPIE_OAT_PATTERN = 'avena sativa kernel'

// Duplicated from actif-class CERAMIDES: coupling cost exceeds duplication cost
// for stable taxonomy. Keep aligned with actif-class-detection.ts.
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

// Ceramides past pos 12 are trace-dose, not the relipidant claim AD formulas are built around.
const ATOPIE_CERAMIDE_POSITION_CAP = 12

// PARFUM/FRAGRANCE collapses to "parfum fragrance" (algo-derm collapses / to space)
// so exact-match would miss it. aroma as substring has minimal FP risk.
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

  if (ingredients.some((ing) => ing.includes(ATOPIE_OAT_PATTERN))) {
    return [S.ECZEMA_ATOPIE]
  }

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

// Named-atopic shelf (Atoderm/Xeracalm/Xemose) carries no reliable INCI signal;
// the chemistry detector above misses it. EU-regulated claims at the cosmetic-to-
// medical-device borderline are used only when genuinely positioned for atopy, so
// precision is high in both name and description. Contraindication prose lives only
// in ingredient/article copy, never in products.description.
// Latent FP: a description that contraindicates atopy would trigger here; handled
// by partitionEczemaReview at every write/audit consumer rather than gating this
// regex (gating would drop the positive forms). No kind gate: an atopy-named
// cleanser is still atopy-positioned.
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

// Cues that invert the atopy signal. psoriasis absent deliberately: "soulage
// eczema/psoriasis" is a positive claim. Sentinel for the ingest pipeline,
// not a live filter on the detector above.
const ATOPIE_CONTRAINDICATION_RE =
  /non recommand|déconseill|ne pas (utiliser|appliquer)|contre-indiqu|à différenc|ne convient pas|éviter (sur|en cas|le contour)/i

// True when a description names atopy under a contraindication: the latent FP
// detectEczemaAtopieFromName cannot distinguish. Ingest routes these to manual
// review to preserve recall on positive forms.
export function eczemaAtopieDescriptionNeedsReview(
  description: string | null | undefined
): boolean {
  // Both tokens must appear in the same sentence: a boilerplate caveat in its own
  // sentence must not trip the sentinel. Split on sentence boundaries, not commas,
  // so "deconseille, aux peaux atopiques" counts as one contraindicating clause.
  const sentences = (description ?? '').split(/[.;!\n]+/)
  return sentences.some((s) => ATOPIE_NAME_RE.test(s) && ATOPIE_CONTRAINDICATION_RE.test(s))
}

// Shared withholding point for all detectAllAutoTags consumers (seed-core, backfill,
// reconcile, live service). Centralised here so the live intake path cannot drift
// out of sync with the runners.
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
