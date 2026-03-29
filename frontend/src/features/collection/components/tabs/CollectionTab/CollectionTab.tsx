import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { ArrowUpDown, Search, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'

import { sortLabels, sortOptions } from '@/features/collection/constants'
import {
  CollectionFilterProvider,
  useCollectionFilter,
} from '@/features/collection/context/CollectionFilterContext'
import { type UserPreferences, userPreferenceQueries } from '@/lib/queries/user-preferences'
import type { UserProduct } from '@/lib/queries/user-products'
import { useUpdateUserProduct } from '@/lib/queries/user-products'
import { CollectionFiltersSheet } from './parts/CollectionFiltersSheet'
import { ProductDetailSheet } from './parts/ProductDetailSheet'
import { ShelfView } from './ShelfView/ShelfView'
import './CollectionTab.css'

interface CollectionTabProps {
  userProducts: UserProduct[] | undefined
}

export function CollectionTab({ userProducts }: CollectionTabProps) {
  const { data: prefs } = useQuery(userPreferenceQueries.get())

  if (!userProducts) {
    return (
      <div className="coll-page-container coll-loading">
        <div className="coll-spinner" />
        <p>Récupération de vos trésors...</p>
      </div>
    )
  }

  return (
    <CollectionFilterProvider userProducts={userProducts} prefs={prefs}>
      <CollectionTabContent prefs={prefs} />
    </CollectionFilterProvider>
  )
}

function CollectionTabContent({ prefs }: { prefs: UserPreferences | undefined }) {
  const { filteredProducts, q, sort, setFilter, hasActiveFilters } = useCollectionFilter()

  const updateMutation = useUpdateUserProduct()

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)
  const [showFiltersSheet, setShowFiltersSheet] = useState(false)

  const selectedProduct = expandedId
    ? (filteredProducts.find((p) => p.id === expandedId) ?? null)
    : null

  const cycleSortBy = () => {
    const idx = sortOptions.indexOf(sort)
    setFilter({ sort: sortOptions[(idx + 1) % sortOptions.length] })
  }

  return (
    <>
      <div className="coll-controls">
        <div className="coll-search-wrapper">
          <Search className="coll-search-icon" size={16} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={q}
            onChange={(e) => setFilter({ q: e.target.value })}
            className="coll-search-input"
          />
        </div>
        <button
          type="button"
          className="coll-sort-btn"
          onClick={cycleSortBy}
          aria-label={`Trier par ${sortLabels[sort]}`}
          title={`Tri : ${sortLabels[sort]}`}
        >
          <ArrowUpDown size={16} />
        </button>
        <button
          type="button"
          className={clsx('coll-filter-toggle', hasActiveFilters && 'active')}
          onClick={() => setShowFiltersSheet(true)}
          aria-label="Filtres avancés"
          title="Filtres avancés"
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>

      <ShelfView
        products={filteredProducts}
        onStatusChange={(productId, newStatus) => {
          updateMutation.mutate({ id: productId, input: { status: newStatus } })
        }}
        onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
        criteriaWeights={prefs?.criteriaWeights}
        displayScale={prefs?.displayScale}
      />

      {showFiltersSheet && <CollectionFiltersSheet onClose={() => setShowFiltersSheet(false)} />}

      {selectedProduct && (
        <ProductDetailSheet
          p={selectedProduct}
          prefs={prefs}
          activeTooltip={activeTooltip}
          setActiveTooltip={setActiveTooltip}
          onClose={() => {
            setExpandedId(null)
            setActiveTooltip(null)
          }}
        />
      )}
    </>
  )
}
