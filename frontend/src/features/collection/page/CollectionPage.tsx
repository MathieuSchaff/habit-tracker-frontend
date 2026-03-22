import type { RepurchaseFlag, UserProductStatus } from '@habit-tracker/shared'

import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  ArrowUpDown,
  BarChart3,
  History,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { calculateWeightedScore } from '../../../lib/helpers/reviews'
import { userPreferenceQueries } from '../../../lib/queries/user-preferences'
import { userProductQueries } from '../../../lib/queries/user-products'
import { CollectionFiltersSheet } from '../components/CollectionFiltersSheet'
import { CollectionInsights } from '../components/CollectionPage/CollectionInsights'
import { CollectionProductCard } from '../components/CollectionProductCard'
import { PurchaseHistoryTab } from '../components/PurchaseHistoryTab'
import { QuickAddModal } from '../components/QuickAddModal/QuickAddModal'
import type { SortOption } from '../constants'
import { sortLabels, sortOptions, statusLabels } from '../constants'

import '../components/CollectionPage/Collection.css'

type Tab = 'collection' | 'history' | 'insights'

export const CollectionPage = () => {
  const [activeTab, setActiveTab] = useState<Tab>('collection')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showFiltersSheet, setShowFiltersSheet] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)

  const [selectedStatus, setSelectedStatus] = useState<UserProductStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [filterBrand, setFilterBrand] = useState<string>('all')
  const [filterKind, setFilterKind] = useState<string>('all')
  const [filterSentiment, setFilterSentiment] = useState<number | 'all'>('all')
  const [filterRepurchase, setFilterRepurchase] = useState<RepurchaseFlag | 'all'>('all')
  const [filterMinNote, setFilterMinNote] = useState<number>(0)
  const [filterMaxPrice, setFilterMaxPrice] = useState<number | ''>('')

  const { data: prefs } = useQuery(userPreferenceQueries.get())
  const { data: userProducts, isLoading: isLoadingCollection } = useQuery(userProductQueries.list())

  const filterOptions = useMemo(() => {
    if (!userProducts) return { brands: [], kinds: [] }
    const brands = Array.from(new Set(userProducts.map((p) => p.product.brand))).sort()
    const kinds = Array.from(new Set(userProducts.map((p) => p.product.kind))).sort()
    return { brands, kinds }
  }, [userProducts])

  const hasActiveFilters =
    filterBrand !== 'all' ||
    filterKind !== 'all' ||
    filterSentiment !== 'all' ||
    filterRepurchase !== 'all' ||
    filterMinNote > 0 ||
    filterMaxPrice !== ''

  const cycleSortBy = () => {
    const idx = sortOptions.indexOf(sortBy)
    setSortBy(sortOptions[(idx + 1) % sortOptions.length])
  }

  const resetFilters = () => {
    setSelectedStatus('all')
    setFilterBrand('all')
    setFilterKind('all')
    setFilterSentiment('all')
    setFilterRepurchase('all')
    setFilterMinNote(0)
    setFilterMaxPrice('')
    setSearchQuery('')
  }

  // TODO: Move filtering to API
  const filteredAndSortedProducts = useMemo(() => {
    if (!userProducts) return []

    const result = userProducts.filter((p) => {
      const score = calculateWeightedScore(p.review, prefs?.criteriaWeights, 'out_of_20')
      const numericScore = score ? parseFloat(score) : 0

      return (
        (selectedStatus === 'all' || p.status === selectedStatus) &&
        (p.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.product.brand.toLowerCase().includes(searchQuery.toLowerCase())) &&
        (filterBrand === 'all' || p.product.brand === filterBrand) &&
        (filterKind === 'all' || p.product.kind === filterKind) &&
        (filterSentiment === 'all' || p.sentiment === filterSentiment) &&
        (filterRepurchase === 'all' || p.wouldRepurchase === filterRepurchase) &&
        numericScore >= filterMinNote &&
        (filterMaxPrice === '' || (p.product.priceCents || 0) / 100 <= filterMaxPrice)
      )
    })

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.product.name.localeCompare(b.product.name)
        case 'sentiment':
          return (b.sentiment || 0) - (a.sentiment || 0)
        case 'note': {
          const sA = Number.parseFloat(
            calculateWeightedScore(a.review, prefs?.criteriaWeights, prefs?.displayScale) || '0'
          )
          const sB = Number.parseFloat(
            calculateWeightedScore(b.review, prefs?.criteriaWeights, prefs?.displayScale) || '0'
          )
          return sB - sA
        }
        case 'date':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case 'price_asc':
          return (a.product.priceCents || 0) - (b.product.priceCents || 0)
        case 'price_desc':
          return (b.product.priceCents || 0) - (a.product.priceCents || 0)
        default:
          return 0
      }
    })

    return result
  }, [
    userProducts,
    selectedStatus,
    searchQuery,
    sortBy,
    prefs,
    filterBrand,
    filterKind,
    filterSentiment,
    filterRepurchase,
    filterMinNote,
    filterMaxPrice,
  ])

  if (activeTab === 'collection' && isLoadingCollection) {
    return (
      <div className="coll-page-container coll-loading">
        <div className="coll-spinner" />
        <p>Récupération de vos trésors...</p>
      </div>
    )
  }

  return (
    <div className="coll-page-wrapper">
      <div className="coll-topbar">
        <span className="coll-topbar-title">Ma Collection</span>
        <button
          type="button"
          className="coll-topbar-add"
          onClick={() => setShowAddModal(true)}
          aria-label="Ajouter un produit"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="coll-icon-tabs">
        <button
          type="button"
          className={clsx('coll-icon-tab', activeTab === 'collection' && 'coll-icon-tab-active')}
          onClick={() => setActiveTab('collection')}
        >
          <Package size={18} />
          <span>Collection</span>
          {userProducts && <span className="coll-tab-badge">{userProducts.length}</span>}
        </button>
        <button
          type="button"
          className={clsx('coll-icon-tab', activeTab === 'insights' && 'coll-icon-tab-active')}
          onClick={() => setActiveTab('insights')}
        >
          <BarChart3 size={18} />
          <span>Analyses</span>
        </button>
        <button
          type="button"
          className={clsx('coll-icon-tab', activeTab === 'history' && 'coll-icon-tab-active')}
          onClick={() => setActiveTab('history')}
        >
          <History size={18} />
          <span>Achats</span>
        </button>
      </div>

      <div className="coll-page-container">
        {activeTab === 'collection' && (
          <>
            <div className="coll-controls">
              <div className="coll-search-wrapper">
                <Search className="coll-search-icon" size={16} />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="coll-search-input"
                />
              </div>
              <button
                type="button"
                className="coll-sort-btn"
                onClick={cycleSortBy}
                aria-label={`Trier par ${sortLabels[sortBy]}`}
                title={`Tri : ${sortLabels[sortBy]}`}
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

            <div className="coll-filters">
              <button
                type="button"
                className={clsx('coll-filter-btn', selectedStatus === 'all' && 'active')}
                onClick={() => setSelectedStatus('all')}
              >
                Tout voir
              </button>
              {(Object.keys(statusLabels) as UserProductStatus[]).map((status) => {
                const cfg = statusLabels[status]
                const Icon = cfg.icon
                return (
                  <button
                    type="button"
                    key={status}
                    className={clsx('coll-filter-btn', selectedStatus === status && 'active')}
                    onClick={() => setSelectedStatus(status)}
                  >
                    <Icon size={12} />
                    {cfg.label}
                  </button>
                )
              })}
            </div>

            {filteredAndSortedProducts.length === 0 ? (
              <div className="coll-empty-state">
                <Package size={44} className="coll-empty-icon" />
                <h3>Aucun produit trouvé</h3>
                <p>Essayez d'ajuster vos filtres ou votre recherche.</p>
              </div>
            ) : (
              <div className="coll-grid">
                {filteredAndSortedProducts.map((p) => (
                  <CollectionProductCard
                    key={p.id}
                    p={p}
                    prefs={prefs}
                    isExpanded={expandedId === p.id}
                    onToggleExpand={() => setExpandedId(expandedId === p.id ? null : p.id)}
                    activeTooltip={activeTooltip}
                    setActiveTooltip={setActiveTooltip}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'insights' && userProducts && (
          <CollectionInsights userProducts={userProducts} />
        )}

        {activeTab === 'history' && <PurchaseHistoryTab userProducts={userProducts ?? []} />}
      </div>

      {showFiltersSheet && (
        <CollectionFiltersSheet
          filterOptions={filterOptions}
          filterBrand={filterBrand}
          setFilterBrand={setFilterBrand}
          filterKind={filterKind}
          setFilterKind={setFilterKind}
          filterSentiment={filterSentiment}
          setFilterSentiment={setFilterSentiment}
          filterRepurchase={filterRepurchase}
          setFilterRepurchase={setFilterRepurchase}
          filterMinNote={filterMinNote}
          setFilterMinNote={setFilterMinNote}
          filterMaxPrice={filterMaxPrice}
          setFilterMaxPrice={setFilterMaxPrice}
          onReset={() => {
            resetFilters()
            setShowFiltersSheet(false)
          }}
          onClose={() => setShowFiltersSheet(false)}
        />
      )}

      {showAddModal && <QuickAddModal onClose={() => setShowAddModal(false)} />}
    </div>
  )
}
