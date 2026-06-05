import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Named-atopic shelf (Atoderm/Xeracalm/Xemose) carries no reliable INCI signal.
// EU-regulated claims at the cosmetic-to-medical-device borderline are used only
// when genuinely positioned for atopy, so precision is high in both name and
// description. Contraindication prose lives only in ingredient/article copy, never
// in products.description.
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

// Shared withholding helper. Each persisting detectAllAutoTags consumer
// (seed-core, backfill, reconcile, live intake) must call this after the
// orchestrator. It is NOT applied inside detectAllAutoTags, so a new writer
// that forgets the call will not withhold. Audit consumers skip it on purpose
// (they measure the raw orchestrator emission).
export function partitionEczemaReview<T extends { tagSlug: SkincareProductTagSlug }>(
  pairs: readonly T[],
  description: string | null | undefined
): { kept: readonly T[]; withheld: boolean } {
  if (!eczemaAtopieDescriptionNeedsReview(description)) {
    return { kept: pairs, withheld: false }
  }
  const kept = pairs.filter((pair) => pair.tagSlug !== S.ECZEMA_ATOPIE)
  return { kept, withheld: kept.length !== pairs.length }
}
