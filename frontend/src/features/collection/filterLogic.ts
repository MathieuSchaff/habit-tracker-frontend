import type { DisplayScale } from '@habit-tracker/shared'

import { type CriteriaWeights, calculateWeightedScore } from '@/lib/helpers/reviews'
import type { UserProduct } from '@/lib/queries/user-products'
import type { CollectionSearch } from '@/routes/_authenticated/collection'

export type CollectionFilters = Pick<
  CollectionSearch,
  'brand' | 'kind' | 'sentiment' | 'repurchase' | 'minNote' | 'maxPrice'
> & { q: string }

export function applyFilters(
  products: UserProduct[],
  filters: CollectionFilters,
  criteriaWeights: CriteriaWeights | undefined
): UserProduct[] {
  const { q, brand, kind, sentiment, repurchase, minNote, maxPrice } = filters
  const needle = q.toLowerCase()

  return products.filter((p) => {
    const score = calculateWeightedScore(p.review, criteriaWeights, 'out_of_20')
    const numericScore = score ? Number.parseFloat(score) : 0

    const matchesSearch =
      p.product.name.toLowerCase().includes(needle) ||
      p.product.brand.toLowerCase().includes(needle)
    const matchesBrand = brand === 'all' || p.product.brand === brand
    const matchesKind = kind === 'all' || p.product.kind === kind
    const matchesSentiment = sentiment === 'all' || p.sentiment === sentiment
    const matchesRepurchase = repurchase === 'all' || p.wouldRepurchase === repurchase
    const matchesNote = numericScore >= minNote
    const matchesPrice = maxPrice === '' || (p.product.priceCents || 0) / 100 <= maxPrice

    return (
      matchesSearch &&
      matchesBrand &&
      matchesKind &&
      matchesSentiment &&
      matchesRepurchase &&
      matchesNote &&
      matchesPrice
    )
  })
}

export function sortProducts(
  products: UserProduct[],
  sort: CollectionSearch['sort'],
  criteriaWeights: CriteriaWeights | undefined,
  displayScale: DisplayScale | undefined
): UserProduct[] {
  const copy = [...products]
  copy.sort((a, b) => {
    switch (sort) {
      case 'name':
        return a.product.name.localeCompare(b.product.name)
      case 'sentiment':
        return (b.sentiment || 0) - (a.sentiment || 0)
      case 'date':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      case 'price_asc':
        return (a.product.priceCents || 0) - (b.product.priceCents || 0)
      case 'price_desc':
        return (b.product.priceCents || 0) - (a.product.priceCents || 0)
      case 'note': {
        const sA = Number.parseFloat(
          calculateWeightedScore(a.review, criteriaWeights, displayScale) || '0'
        )
        const sB = Number.parseFloat(
          calculateWeightedScore(b.review, criteriaWeights, displayScale) || '0'
        )
        return sB - sA
      }
      default:
        return 0
    }
  })
  return copy
}
