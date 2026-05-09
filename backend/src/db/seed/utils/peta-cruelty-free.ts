// Pure logic for the PETA Beauty Without Bunnies scraper (T4.E). The
// runner owns I/O (HTTP, cache, DB upsert) so this module stays unit-
// testable on small fixtures.
//
// PETA's Ultimate Cruelty-Free List exposes per-company URLs at
//   https://crueltyfree.peta.org/company/<slug>/
// IMPORTANT: HTTP 200 alone is NOT a cruelty-free claim. PETA serves
// pages for every indexed brand (signed CF policy or not). The body
// distinguishes the two cases:
//   - signed (CF):  breadcrumb "Cruelty-free Companies" + headline
//                   "<Brand> is Cruelty-Free".
//   - unsigned:     breadcrumb "Companies" + headline
//                   "<Brand> may not be cruelty-free".
// 404 = brand never indexed (no PETA opinion at all).
//
// We probe the body via the JSON-LD breadcrumb because it's stable
// across template changes (the headline phrasing has shifted across
// PETA redesigns, but Yoast's BreadcrumbList schema is canonical).
//
// Slug normalization mirrors PETA's WordPress permalink rule (verified
// manually on top corpus brands : `I'm From` → `im-from`, `Axis-Y` →
// `axis-y`, `Beauty of Joseon` → `beauty-of-joseon`, `COSRX` → `cosrx`).
// PETA strips apostrophes outright (no dash replacement) but converts
// every other non-alphanumeric run to a single dash. Existing dashes in
// the brand string are preserved.

export function petaSlug(brand: string): string {
  return brand
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// PETA brands sometimes have alternate slugs (legacy redirects, name
// variants). We try the primary slug first ; if 404, try a fallback that
// REPLACES apostrophes with dashes instead of dropping them. Most modern
// PETA URLs use the dropped-apostrophe form, but some older entries kept
// the dash form. Cheap to try both.
export function petaSlugVariants(brand: string): string[] {
  const primary = petaSlug(brand)
  const altApostropheAsDash = brand
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (altApostropheAsDash !== primary) return [primary, altApostropheAsDash]
  return [primary]
}

export type PetaPageStatus = 'cruelty-free' | 'not-cf' | 'unknown'
export type PetaProbeStatus = 'cruelty-free' | 'not-listed' | 'unknown' | 'error'

// Parse a fetched company page body. The breadcrumb's `Cruelty-free Companies`
// vs `Companies` is the canonical signal ; we accept either the JSON-LD form
// (`"name":"Cruelty-free Companies"`) or the rendered breadcrumb anchor.
export function parsePetaPageStatus(html: string): PetaPageStatus {
  if (
    html.includes('"name":"Cruelty-free Companies"') ||
    html.includes('Cruelty-free Companies &gt;') ||
    html.includes('Cruelty-free Companies >')
  ) {
    return 'cruelty-free'
  }
  if (html.includes('may not be cruelty-free')) return 'not-cf'
  return 'unknown'
}

export interface PerSlugStatus {
  httpCode: number
  pageStatus: PetaPageStatus | null // null when httpCode === 404
}

// Decide a final brand status from the per-slug probe results.
//   - any cruelty-free page → cruelty-free
//   - all 404 → not-listed (PETA has no entry, no opinion)
//   - any 200 + parsed status 'not-cf' → not-cf
//   - mixed inconclusive → unknown
export function decidePetaStatus(perSlugStatus: Map<string, PerSlugStatus>): PetaProbeStatus {
  let sawNotCf = false
  let sawNotFound = false
  let sawUnknown = false
  for (const s of perSlugStatus.values()) {
    if (s.pageStatus === 'cruelty-free') return 'cruelty-free'
    if (s.httpCode === 404) sawNotFound = true
    else if (s.pageStatus === 'not-cf') sawNotCf = true
    else if (s.pageStatus === 'unknown' && s.httpCode === 200) sawUnknown = true
    else if (s.httpCode !== 200 && s.httpCode !== 404) return 'error'
  }
  if (sawNotCf) return 'not-listed' // page exists but unsigned = not on PETA's CF list
  if (sawNotFound) return 'not-listed'
  if (sawUnknown) return 'unknown'
  return 'error'
}
