import type { ProductKind, ProductUnit } from '@habit-tracker/shared'

export type ProductListItem = {
  id: string
  slug: string
  name: string
  brand: string
  kind: ProductKind
  unit: ProductUnit
  priceCents: number | null
  totalAmount: number | null
  amountUnit: string
  imageUrl: string | null
  profileMatches: string[]
  tags: { slug: string; tagType: string; relevance: 'primary' | 'secondary' }[]
}

// Tag-by-product map kept alongside the list so the products handler can
// honor concern/skin_type/etc. filters during integration tests. Slugs match
// shared/src/products/skincare/tag-slugs.ts. Not part of the API response.
export const PRODUCT_TAGS: Record<string, string[]> = {
  '11111111-1111-1111-1111-111111111111': ['barriere-cutanee', 'peau-seche'],
  '22222222-2222-2222-2222-222222222222': ['anti-acne', 'pores-dilates'],
}

// Ingredient slugs per product — same purpose as PRODUCT_TAGS but for the
// async ingredient filter.
export const PRODUCT_INGREDIENTS: Record<string, string[]> = {
  '11111111-1111-1111-1111-111111111111': ['glycerin', 'hyaluronic-acid'],
  '22222222-2222-2222-2222-222222222222': ['niacinamide'],
}

export const PRODUCTS: ProductListItem[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'cerave-hydrating-cleanser',
    name: 'Hydrating Cleanser',
    brand: 'CeraVe',
    kind: 'cleanser',
    unit: 'pump',
    priceCents: 1299,
    totalAmount: 236,
    amountUnit: 'ml',
    imageUrl: null,
    profileMatches: [],
    tags: [
      { slug: 'barriere-cutanee', tagType: 'concern', relevance: 'primary' },
      { slug: 'peau-seche', tagType: 'skin_type', relevance: 'primary' },
    ],
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    slug: 'the-ordinary-niacinamide-10',
    name: 'Niacinamide 10% + Zinc 1%',
    brand: 'The Ordinary',
    kind: 'serum',
    unit: 'dropper',
    priceCents: 699,
    totalAmount: 30,
    amountUnit: 'ml',
    imageUrl: null,
    profileMatches: [],
    tags: [
      { slug: 'anti-acne', tagType: 'concern', relevance: 'primary' },
      { slug: 'pores-dilates', tagType: 'concern', relevance: 'secondary' },
    ],
  },
]

// Counts derived from PRODUCT_TAGS so chips with at least one match render
// enabled. Anything absent stays 0 → chip disabled in the drawer.
const _counts: Record<string, number> = {}
for (const tags of Object.values(PRODUCT_TAGS)) {
  for (const t of tags) _counts[t] = (_counts[t] ?? 0) + 1
}

export const PRODUCT_FILTER_OPTIONS = {
  kinds: ['cleanser', 'serum', 'moisturizer'] as ProductKind[],
  brands: ['CeraVe', 'The Ordinary'],
  tagCounts: _counts,
}
