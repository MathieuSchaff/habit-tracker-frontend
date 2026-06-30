import { detectKindPrimaryType, type ProductKind } from '@aurore/shared'

import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { createContext, type ReactNode, use, useCallback, useMemo, useState } from 'react'

import { applyFilters, sortProducts } from '@/features/collection/filterLogic'
import { compatibilityScoresQuery } from '@/lib/queries/compatibility'
import type { UserPreferences } from '@/lib/queries/user-preferences'
import type { UserProduct } from '@/lib/queries/user-products'
import type { CollectionSearch } from '@/routes/_authenticated/collection.index'

const routeApi = getRouteApi('/_authenticated/collection/')

export type CollectionFilterValues = {
  brand: string
  productType: string
  sentiment: number | 'all'
  repurchase: 'yes' | 'no' | 'unsure' | 'all'
  minNote: number
  maxPrice: number | ''
}

export const DEFAULT_FILTERS: CollectionFilterValues = {
  brand: 'all',
  productType: 'all',
  sentiment: 'all',
  repurchase: 'all',
  minNote: 0,
  maxPrice: '',
}

type CollectionFilterUpdates = Partial<CollectionSearch> & { q?: string }

type CollectionFilterContextValue = {
  q: string
  sort: CollectionSearch['sort']
  brand: string
  productType: string
  sentiment: number | 'all'
  repurchase: 'yes' | 'no' | 'unsure' | 'all'
  minNote: number
  maxPrice: number | ''

  filteredProducts: UserProduct[]
  filterOptions: { brands: string[]; productTypes: string[] }
  hasActiveFilters: boolean
  compatScores: Record<string, number | null>
  compatError: boolean

  setFilter: (updates: CollectionFilterUpdates) => void
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
  const { sort, brand, productType, sentiment, repurchase, minNote, maxPrice } =
    routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  // Local state - URL-bound search would re-run the route loader on every keystroke.
  const [q, setQ] = useState('')

  const productIds = useMemo(() => userProducts?.map((p) => p.product.id) ?? [], [userProducts])
  const { data: compatScores, isError: compatError } = useQuery(
    compatibilityScoresQuery(productIds)
  )

  const filterOptions = useMemo(() => {
    if (!userProducts) return { brands: [], productTypes: [] }
    const brands = Array.from(new Set(userProducts.map((p) => p.product.brand))).sort()
    // Derive TYPE_* slugs from kind. Haircare/dental/complement have no mapping yet
    // and surface via brand/note filters only.
    const types = new Set<string>()
    for (const up of userProducts) {
      const t = detectKindPrimaryType(up.product.kind as ProductKind)
      if (t) types.add(t)
    }
    return { brands, productTypes: [...types].sort() }
  }, [userProducts])

  const filteredProducts = useMemo(() => {
    if (!userProducts) return []
    const filtered = applyFilters(
      userProducts,
      { q, brand, productType, sentiment, repurchase, minNote, maxPrice },
      prefs?.criteriaWeights
    )
    return sortProducts(filtered, sort, prefs?.criteriaWeights, prefs?.displayScale, compatScores)
  }, [
    userProducts,
    q,
    sort,
    prefs,
    brand,
    productType,
    sentiment,
    repurchase,
    minNote,
    maxPrice,
    compatScores,
  ])

  const hasActiveFilters = useMemo(() => {
    return (
      brand !== 'all' ||
      productType !== 'all' ||
      sentiment !== 'all' ||
      repurchase !== 'all' ||
      minNote > 0 ||
      maxPrice !== ''
    )
  }, [brand, productType, sentiment, repurchase, minNote, maxPrice])

  const setFilter = useCallback(
    (updates: CollectionFilterUpdates) => {
      const { q: nextQ, ...rest } = updates
      if (nextQ !== undefined) setQ(nextQ)
      if (Object.keys(rest).length > 0) {
        navigate({ search: (prev) => ({ ...prev, ...rest }) })
      }
    },
    [navigate]
  )

  const resetFilters = useCallback(() => {
    setFilter({ ...DEFAULT_FILTERS, q: '' })
  }, [setFilter])

  return (
    <CollectionFilterContext
      value={{
        q,
        sort,
        brand,
        productType,
        sentiment,
        repurchase,
        minNote,
        maxPrice,
        filteredProducts,
        filterOptions,
        hasActiveFilters,
        compatScores: compatScores ?? {},
        compatError,
        setFilter,
        resetFilters,
      }}
    >
      {children}
    </CollectionFilterContext>
  )
}

export function useCollectionFilter(): CollectionFilterContextValue {
  const ctx = use(CollectionFilterContext)
  if (!ctx) throw new Error('useCollectionFilter must be used within CollectionFilterProvider')
  return ctx
}

// Null-safe: returns the product's empirical compatibility score, or null when
// outside the provider (e.g. unit tests rendering a card in isolation).
export function useCompatScore(productId: string): number | null {
  const ctx = use(CollectionFilterContext)
  return ctx?.compatScores[productId] ?? null
}
