import { detectKindPrimaryType, type ProductKind } from '@aurore/shared'

import { compareInstant } from '@/lib/dates'
import { type CriteriaWeights, calculateWeightedScore } from '@/lib/helpers/reviews'
import type { UserProduct } from '@/lib/queries/user-products'
import type { CollectionSearch } from '@/routes/_authenticated/collection.index'

export type CollectionFilters = Pick<
  CollectionSearch,
  'brand' | 'productType' | 'sentiment' | 'repurchase' | 'minNote' | 'maxPrice'
> & { q: string }

function getNumericReviewScore(p: UserProduct, weights: CriteriaWeights | undefined): number {
  const score = calculateWeightedScore(p.review, weights)
  return score ? Number.parseFloat(score) : 0
}

export function applyFilters(
  products: UserProduct[],
  filters: CollectionFilters,
  criteriaWeights: CriteriaWeights | undefined
): UserProduct[] {
  const { q, brand, productType, sentiment, repurchase, minNote, maxPrice } = filters
  const needle = q.toLowerCase()

  return products.filter((p) => {
    const numericScore = getNumericReviewScore(p, criteriaWeights)

    const matchesSearch =
      p.product.name.toLowerCase().includes(needle) ||
      p.product.brand.toLowerCase().includes(needle)
    const matchesBrand = brand === 'all' || p.product.brand === brand
    const matchesProductType =
      productType === 'all' || detectKindPrimaryType(p.product.kind as ProductKind) === productType
    const matchesSentiment = sentiment === 'all' || p.sentiment === sentiment
    const matchesRepurchase = repurchase === 'all' || p.wouldRepurchase === repurchase
    const matchesNote = numericScore >= minNote
    const matchesPrice = maxPrice === '' || (p.product.priceCents || 0) / 100 <= maxPrice

    return (
      matchesSearch &&
      matchesBrand &&
      matchesProductType &&
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
  compatScores?: Record<string, number | null>
): UserProduct[] {
  const copy = [...products]
  copy.sort((a, b) => {
    switch (sort) {
      case 'name':
        return a.product.name.localeCompare(b.product.name)
      case 'sentiment':
        return (b.sentiment || 0) - (a.sentiment || 0)
      case 'date':
        return compareInstant(b.updatedAt, a.updatedAt)
      case 'price_asc':
        return (a.product.priceCents || 0) - (b.product.priceCents || 0)
      case 'price_desc':
        return (b.product.priceCents || 0) - (a.product.priceCents || 0)
      case 'note':
        return getNumericReviewScore(b, criteriaWeights) - getNumericReviewScore(a, criteriaWeights)
      case 'compatibility_desc': {
        // Null-last: products with no empirical score sort below scored ones.
        const sa = compatScores?.[a.product.id] ?? Number.NEGATIVE_INFINITY
        const sb = compatScores?.[b.product.id] ?? Number.NEGATIVE_INFINITY
        return sb - sa
      }
      default:
        return 0
    }
  })
  return copy
}
