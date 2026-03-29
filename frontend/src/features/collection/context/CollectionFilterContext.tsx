import { getRouteApi } from '@tanstack/react-router'
import { createContext, type ReactNode, useCallback, useContext, useMemo } from 'react'

import { calculateWeightedScore } from '@/lib/helpers/reviews'
import type { UserPreferences } from '@/lib/queries/user-preferences'
import type { UserProduct } from '@/lib/queries/user-products'
import type { CollectionSearch } from '@/routes/_authenticated/collection'

const routeApi = getRouteApi('/_authenticated/collection')

type CollectionFilterContextValue = {
  q: string
  sort: CollectionSearch['sort']
  brand: string
  kind: string
  sentiment: number | 'all'
  repurchase: 'yes' | 'no' | 'unsure' | 'all'
  minNote: number
  maxPrice: number | ''

  filteredProducts: UserProduct[]
  filterOptions: { brands: string[]; kinds: string[] }
  hasActiveFilters: boolean

  setFilter: (updates: Partial<CollectionSearch>) => void
  resetFilters: () => void
}

const CollectionFilterContext = createContext<CollectionFilterContextValue | null>(null)

interface CollectionFilterProviderProps {
  userProducts: UserProduct[] | undefined
  prefs: UserPreferences | undefined
  children: ReactNode
}

export function CollectionFilterProvider({
  userProducts,
  prefs,
  children,
}: CollectionFilterProviderProps) {
  const { q, sort, brand, kind, sentiment, repurchase, minNote, maxPrice } = routeApi.useSearch()
  const navigate = routeApi.useNavigate()

  const filterOptions = useMemo(() => {
    if (!userProducts) return { brands: [], kinds: [] }
    const brands = Array.from(new Set(userProducts.map((p) => p.product.brand))).sort()
    const kinds = Array.from(new Set(userProducts.map((p) => p.product.kind))).sort()
    return { brands, kinds }
  }, [userProducts])

  const filteredProducts = useMemo(() => {
    if (!userProducts) return []

    const result = userProducts.filter((p) => {
      const score = calculateWeightedScore(p.review, prefs?.criteriaWeights, 'out_of_20')
      const numericScore = score ? Number.parseFloat(score) : 0

      const matchesSearch =
        p.product.name.toLowerCase().includes(q.toLowerCase()) ||
        p.product.brand.toLowerCase().includes(q.toLowerCase())

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

    result.sort((a, b) => {
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
            calculateWeightedScore(a.review, prefs?.criteriaWeights, prefs?.displayScale) || '0'
          )
          const sB = Number.parseFloat(
            calculateWeightedScore(b.review, prefs?.criteriaWeights, prefs?.displayScale) || '0'
          )
          return sB - sA
        }
        default:
          return 0
      }
    })

    return result
  }, [userProducts, q, sort, prefs, brand, kind, sentiment, repurchase, minNote, maxPrice])

  const hasActiveFilters = useMemo(() => {
    return (
      brand !== 'all' ||
      kind !== 'all' ||
      sentiment !== 'all' ||
      repurchase !== 'all' ||
      minNote > 0 ||
      maxPrice !== ''
    )
  }, [brand, kind, sentiment, repurchase, minNote, maxPrice])

  const setFilter = useCallback(
    (updates: Partial<CollectionSearch>) => {
      navigate({ search: (prev) => ({ ...prev, ...updates }) })
    },
    [navigate]
  )

  const resetFilters = useCallback(() => {
    setFilter({
      brand: 'all',
      kind: 'all',
      sentiment: 'all',
      repurchase: 'all',
      minNote: 0,
      maxPrice: '',
      q: '',
    })
  }, [setFilter])

  return (
    <CollectionFilterContext.Provider
      value={{
        q,
        sort,
        brand,
        kind,
        sentiment,
        repurchase,
        minNote,
        maxPrice,
        filteredProducts,
        filterOptions,
        hasActiveFilters,
        setFilter,
        resetFilters,
      }}
    >
      {children}
    </CollectionFilterContext.Provider>
  )
}

export function useCollectionFilter(): CollectionFilterContextValue {
  const ctx = useContext(CollectionFilterContext)
  if (!ctx) throw new Error('useCollectionFilter must be used within CollectionFilterProvider')
  return ctx
}
