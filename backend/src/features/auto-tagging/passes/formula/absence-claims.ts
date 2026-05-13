import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@habit-tracker/shared'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Name/description-based override for absence labels (`sans-parfum`, etc.).
// Algo-derm pass 1 derives these from INCI absence + coverage ≥ 0.7. Products
// with short or scraped INCI miss the coverage gate even when the brand
// explicitly claims the absence. Regulatory pressure on cosmetic claims makes
// "sans parfum" / "fragrance-free" reliable when written in the product
// name/description — strict literal match keeps false positives near zero
// (comparative phrasings like "preferred over fragrance-free formulas" are
// rare in product copy).
//
// Currently scoped to SANS_PARFUM. Other absences (sans-sulfates / sans-
// silicones / sans-huiles-essentielles) have <15 name-claim occurrences in
// the corpus — algo-derm coverage handles them well enough. Extend here if
// the gap widens.

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
