import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Name/description override for absence labels. Products with short/scraped INCI
// miss the algo-derm coverage >= 0.7 gate even when the brand explicitly claims
// the absence. Regulatory pressure makes "sans parfum"/"fragrance-free" reliable
// in product name/description; strict literal match keeps FP near zero.
//
// Scoped to SANS_PARFUM: other absences have <15 name-claim occurrences in the
// corpus. Extend here if the gap widens.

const SANS_PARFUM_PATTERN = /sans[\s-]+parfum|fragrance[\s-]*free|parfum[\s-]*free/

export function detectAbsenceClaimsFromText(
  name: string | null | undefined,
  description: string | null | undefined
): SkincareProductTagSlug[] {
  const blob = `${name ?? ''} ${description ?? ''}`.toLowerCase()
  if (!blob.trim()) return []
  const out: SkincareProductTagSlug[] = []
  if (SANS_PARFUM_PATTERN.test(blob)) out.push(S.SANS_PARFUM)
  return out
}
