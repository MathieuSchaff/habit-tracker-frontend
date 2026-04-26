import type {
  IngredientType,
  SkincareIngredientCategory,
  SkincareIngredientFilterOptions,
} from '@habit-tracker/shared'

// Search-result shape (subset returned by /api/ingredients/search).
export type IngredientSearchHit = {
  id: string
  name: string
  slug: string
  type: IngredientType
  category: SkincareIngredientCategory | null
}

// /api/ingredients/by-slugs returns only { slug, name }.
export type IngredientBySlug = { slug: string; name: string }

// 10 ingredients chosen to exercise search overlap (niacinamide vs niacin-pca),
// resolve-by-slugs, and category diversity.
export const INGREDIENTS: IngredientSearchHit[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Niacinamide',
    slug: 'niacinamide',
    type: 'skincare',
    category: 'actif',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Niacin PCA',
    slug: 'niacin-pca',
    type: 'skincare',
    category: 'actif',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Retinol',
    slug: 'retinol',
    type: 'skincare',
    category: 'actif',
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    name: 'Azelaic Acid',
    slug: 'azelaic-acid',
    type: 'skincare',
    category: 'actif',
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    name: 'Salicylic Acid',
    slug: 'salicylic-acid',
    type: 'skincare',
    category: 'actif',
  },
  {
    id: '00000000-0000-0000-0000-000000000006',
    name: 'Glycerin',
    slug: 'glycerin',
    type: 'skincare',
    category: 'humectant',
  },
  {
    id: '00000000-0000-0000-0000-000000000007',
    name: 'Hyaluronic Acid',
    slug: 'hyaluronic-acid',
    type: 'skincare',
    category: 'humectant',
  },
  {
    id: '00000000-0000-0000-0000-000000000008',
    name: 'Centella Asiatica',
    slug: 'centella-asiatica',
    type: 'skincare',
    category: 'actif',
  },
  {
    id: '00000000-0000-0000-0000-000000000009',
    name: 'Squalane',
    slug: 'squalane',
    type: 'skincare',
    category: 'emollient',
  },
  {
    id: '00000000-0000-0000-0000-00000000000a',
    name: 'Matrixyl 3000',
    slug: 'matrixyl-3000',
    type: 'skincare',
    category: 'actif',
  },
]

export const INGREDIENT_BY_SLUG: Record<string, IngredientBySlug> = Object.fromEntries(
  INGREDIENTS.map((i) => [i.slug, { slug: i.slug, name: i.name }])
)

// Minimal filter-options stub; tag buckets empty by default.
export const INGREDIENT_FILTER_OPTIONS: SkincareIngredientFilterOptions = {
  tags: {
    skin_type: [],
    concern: [],
    ingredient_attribute: [],
    skin_effect: [],
    shared_label: [],
  } as SkincareIngredientFilterOptions['tags'],
}
