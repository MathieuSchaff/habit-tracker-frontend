import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import clsx from 'clsx'
import { ArrowUpDown, Search, SlidersHorizontal } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'

import { Button } from '@/component/Button/Button'
import { Input } from '@/component/Input/Input'
import { sortAriaLabel, sortOptions, sortTitle } from '@/features/collection/constants'
import {
  CollectionFilterProvider,
  useCollectionFilter,
} from '@/features/collection/context/CollectionFilterContext'
import { useAnnounce } from '@/hooks/useAnnounce'
import { useCreateComparison } from '@/lib/queries/comparisons'
import { userPreferenceQueries } from '@/lib/queries/user-preferences'
import type { UserProduct } from '@/lib/queries/user-products'
import { useUpdateUserProduct } from '@/lib/queries/user-products'
import { ShelfView } from './ShelfView/ShelfView'
import './CollectionTab.css'

const CollectionFiltersSheet = lazy(() =>
  import('./parts/CollectionFiltersSheet').then((m) => ({ default: m.CollectionFiltersSheet }))
)

const ProductDetailSheet = lazy(() =>
  import('./ProductViews/Detailed/ProductDetailSheet').then((m) => ({
    default: m.ProductDetailSheet,
  }))
)

const COMPAT_ERROR_MESSAGE = 'Affinités indisponibles pour le moment.'

interface CollectionTabProps {
  userProducts: UserProduct[] | undefined
  onAddClick: () => void
}

export function CollectionTab({ userProducts, onAddClick }: CollectionTabProps) {
  const { data: prefs } = useQuery(userPreferenceQueries.get())

  if (!userProducts) {
    return (
      <output className="coll-page-container coll-loading" aria-live="polite">
        <div className="coll-spinner" aria-hidden="true" />
        <p>Chargement de votre étagère…</p>
      </output>
    )
  }

  return (
    <CollectionFilterProvider userProducts={userProducts} prefs={prefs}>
      <CollectionTabContent onAddClick={onAddClick} />
    </CollectionFilterProvider>
  )
}

function CollectionTabContent({ onAddClick }: { onAddClick: () => void }) {
  const { filteredProducts, q, sort, setFilter, hasActiveFilters, compatError } =
    useCollectionFilter()
  const navigate = useNavigate()

  const updateMutation = useUpdateUserProduct()
  const announce = useAnnounce()
  const createComparison = useCreateComparison()

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showFiltersSheet, setShowFiltersSheet] = useState(false)

  // A notice mounted with its content isn't reliably announced; route it through the live region.
  useEffect(() => {
    if (compatError) announce(COMPAT_ERROR_MESSAGE)
  }, [compatError, announce])

  const selectedProduct = expandedId
    ? (filteredProducts.find((p) => p.id === expandedId) ?? null)
    : null

  const sortIdx = sortOptions.indexOf(sort)
  const nextSort = sortOptions[(sortIdx + 1) % sortOptions.length]
  const cycleSortBy = () => setFilter({ sort: nextSort })

  return (
    <>
      <div className="coll-toolbar">
        <div className="coll-controls">
          <div className="coll-search-wrapper">
            <Search className="coll-search-icon" size={16} aria-hidden="true" />
            <Input
              placeholder="Rechercher..."
              value={q}
              onChange={(e) => setFilter({ q: e.target.value })}
              className="coll-search-input"
              aria-label="Rechercher dans la collection"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="coll-sort-btn"
            onClick={cycleSortBy}
            aria-label={sortAriaLabel(sort, nextSort)}
            title={sortTitle(sort)}
          >
            <ArrowUpDown size={16} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={clsx('coll-filter-toggle', hasActiveFilters && 'active')}
            onClick={() => setShowFiltersSheet(true)}
            aria-label="Filtres avancés"
            title="Filtres avancés"
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {compatError && <p className="coll-compat-error">{COMPAT_ERROR_MESSAGE}</p>}

      <ShelfView
        products={filteredProducts}
        onStatusChange={(productId, newStatus) => {
          updateMutation.mutate(
            { id: productId, input: { status: newStatus } },
            { onSuccess: () => announce('Statut mis à jour') }
          )
        }}
        onStatusChangeMany={(productIds, newStatus) => {
          for (const id of productIds) {
            updateMutation.mutate({ id, input: { status: newStatus } })
          }
          const n = productIds.length
          announce(`${n} produit${n > 1 ? 's' : ''} déplacé${n > 1 ? 's' : ''}`)
        }}
        onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
        onAddClick={onAddClick}
        onCompare={(ids) => {
          const productIds = ids
            .map((id) => filteredProducts.find((p) => p.id === id)?.productId)
            .filter((pid): pid is string => Boolean(pid))
          if (productIds.length !== ids.length || createComparison.isPending) return
          createComparison.mutate(
            { productIds },
            {
              onSuccess: (created) =>
                void navigate({ to: '/products/compare/$id', params: { id: created.id } }),
            }
          )
        }}
      />

      {showFiltersSheet && (
        <Suspense fallback={null}>
          <CollectionFiltersSheet onClose={() => setShowFiltersSheet(false)} />
        </Suspense>
      )}

      {selectedProduct && (
        <Suspense fallback={null}>
          <ProductDetailSheet
            p={selectedProduct}
            onClose={() => {
              setExpandedId(null)
            }}
          />
        </Suspense>
      )}
    </>
  )
}
