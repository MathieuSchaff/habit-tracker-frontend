import type { SkinConcern } from '../profile'

// User concern slugs (SKIN_CONCERNS) and product tag concern slugs evolved
// in parallel and don't share vocab. This table is the *only* place the
// drift is documented — every other layer (backend listProducts avoid_for,
// frontend profile filter) goes through `resolveAvoidSlugs`.
//
// Some user concerns are clinically distinct but the product taxonomy only
// has a generic tag (e.g. rosacee/couperose/flushs all → rougeurs-vasculaires).
// That's intentional: the product tag *is* generic — splitting it would force
// arbitrary retagging without clinical data per product.
//
// `microbiome` previously lived in SKIN_CONCERNS but had no product tag
// counterpart (no avoid data, no positive data). Removed from the enum.
export const USER_CONCERN_TO_PRODUCT_TAGS: Record<SkinConcern, readonly string[]> = {
  // identities — user slug = product slug
  'barriere-cutanee': ['barriere-cutanee'],
  'anti-age': ['anti-age'],
  'cernes-poches': ['cernes-poches'],
  deshydratation: ['deshydratation'],
  hyperpigmentation: ['hyperpigmentation'],
  'keratose-pilaire': ['keratose-pilaire'],
  // 1→1 renames (user lay term → product clinical term)
  'anti-acne': ['acne-imperfections'],
  'anti-taches': ['hyperpigmentation'],
  cicatrisation: ['reparation-cutanee'],
  eclat: ['eclat-teint-uniforme'],
  'teint-terne': ['eclat-teint-uniforme'],
  eczema: ['eczema-atopie'],
  // N→1 — 4 user nuances map to 1 generic product tag
  'anti-rougeurs': ['rougeurs-vasculaires'],
  rosacee: ['rougeurs-vasculaires'],
  couperose: ['rougeurs-vasculaires'],
  flushs: ['rougeurs-vasculaires'],
  // 1→1 onto same product tag (two user terms collapse on pores-sebum)
  'pores-dilates': ['pores-sebum'],
  brillance: ['pores-sebum'],
  // 1→N — one user concern fans out to multiple product tags
  'post-acne': ['acne-imperfections', 'reparation-cutanee'],
  'photo-vieillissement': ['anti-age'],
  repulpant: ['anti-age'],
  'grain-peau': ['pores-sebum'],
}

// Caller passes the raw `avoid_for` payload (skin types + skin concerns mixed).
// Skin type slugs (peau-seche, etc.) match product tag slugs 1:1 — fall through
// unchanged. Concerns are remapped. Result is deduped so SQL inArray stays tight.
export function resolveAvoidSlugs(rawSlugs: readonly string[]): string[] {
  const out = new Set<string>()
  for (const slug of rawSlugs) {
    const mapped = USER_CONCERN_TO_PRODUCT_TAGS[slug as SkinConcern]
    if (mapped) {
      for (const target of mapped) out.add(target)
    } else {
      out.add(slug)
    }
  }
  return Array.from(out)
}
