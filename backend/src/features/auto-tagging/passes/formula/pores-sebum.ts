import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

import { matchesNamePositioning } from './pass-helpers'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Positioning gate for `pores-sebum` (re-emits an algo-derm slug, ADR-0004, R5).
// algo-derm fires on sebum-control actives in the INCI (niacinamide, salicylic acid,
// zinc) regardless of positioning — a brightening or hydrating product that contains one
// gets tagged (P=0.170). The gate requires the pore/sebum lexical field in the name/claim.
// No exclusion: unlike rougeurs (camouflage makeup), every candidate exclusion token here
// (brightening, sunscreen, makeup-remover, non-comedogenic) hit gold-positives. The 17
// residual FP are gold-set-strict boundary cases. Gold set: P 0.170→0.807, R 0.211→1.000.
export const PORES_SEBUM_POSITION_RE =
  /\bpor[eo]s?\b|s[eé]b(um|[uo]m|orr)|matif|brillan[ct]|\bblackhead|\bpoints?\s+noirs?\b|oil[\s-]control|\bpeau[sx]?\s+grasse\b|grain\s+de\s+peau|\bargile\b|\bcom[eé]don|mixtes?\s+[aà]\s+grasse|nettoyant\b.{0,30}r[eé]gulat|r[eé]gulat\w*.{0,30}nettoyant/i

export function detectPoresSebumFromName(
  name: string | null | undefined,
  description: string | null | undefined
): SkincareProductTagSlug[] {
  return matchesNamePositioning(name, description, PORES_SEBUM_POSITION_RE) ? [S.PORES_SEBUM] : []
}
