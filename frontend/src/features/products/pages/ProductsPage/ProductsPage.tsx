import {
  PRODUCT_DOMAIN_TAB_META,
  PRODUCT_DOMAIN_TABS,
  type ProductDomainTab,
} from '@habit-tracker/shared'

import { useQuery } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Package } from 'lucide-react'
import { startTransition, useCallback, useState } from 'react'

import { Button } from '@/component/Button/Button'
import { ListPagination } from '@/component/DataDisplay/Pagination/ListPagination'
import { EmptyState } from '@/component/Feedback/ui/EmptyState/EmptyState'
import { emptyFilters, type FilterValues } from '@/component/Filter'
import { type TabOption, Tabs } from '@/component/Tabs/Tabs'
import { AddToCollectionModal } from '@/features/products/components/AddToCollectionModal/AddToCollectionModal'
import {
  type AddToCollectionTarget,
  ProductCard,
} from '@/features/products/components/ProductCard/ProductCard'
import { ProductsActiveBar } from '@/features/products/components/ProductsActiveBar/ProductsActiveBar'
import { ProductsFilterDrawerContent } from '@/features/products/components/ProductsFilterDrawerContent/ProductsFilterDrawerContent'
import { ProductsHeader } from '@/features/products/components/ProductsHeader/ProductsHeader'
import { FILTER_KEYS, type FilterKey, TAG_FILTER_KEYS } from '@/features/products/filters'
import {
  buildDomainSwitchSearch,
  buildProductsApiFilters,
  buildResetSearchParams,
  hasActivePriceRange,
} from '@/features/products/helpers'
import { useProductsExtraChips } from '@/features/products/hooks/useProductsExtraChips'
import { useProductsFilterGroups } from '@/features/products/hooks/useProductsFilterGroups'
import { useListFilters } from '@/hooks/useListFilters'
import { type ListProductsFilters, type ProductSort, productQueries } from '@/lib/queries/products'
import { profileQueries } from '@/lib/queries/profile'
import { useAuthStore } from '@/store/auth'

import '@/component/Layout/PageLayout/ListPage.css'
import './ProductsPage.css'
import '@/features/products/styles/kinds.css'

const routeApi = getRouteApi('/products/')

// Only tag keys — omits brand/ingredient/kind — so domain switch resets tags
// without clobbering ingredient (which buildDomainSwitchSearch preserves explicitly).
const EMPTY_TAG_FILTERS = emptyFilters(TAG_FILTER_KEYS) as Record<string, string[]>

const EMPTY_FILTERS = emptyFilters(FILTER_KEYS)

const DOMAIN_TAB_OPTIONS: TabOption<ProductDomainTab>[] = [...PRODUCT_DOMAIN_TABS]
  .sort((a, b) => PRODUCT_DOMAIN_TAB_META[a].order - PRODUCT_DOMAIN_TAB_META[b].order)
  .map((id) => ({ id, label: PRODUCT_DOMAIN_TAB_META[id].label }))

export function ProductsPage() {
  const [isDrawerOpen, setDrawerOpen] = useState(false)
  const [modalProduct, setModalProduct] = useState<AddToCollectionTarget | null>(null)

  const search = routeApi.useSearch()
  const { page, profile_filter, sort, priceMin, priceMax, category, q } = search
  const navigate = useNavigate({ from: '/products/' })

  const user = useAuthStore((s) => s.user)

  const { data: dermoProfile } = useQuery({
    ...profileQueries.dermo(),
    enabled: !!user && profile_filter,
  })

  const avoidFor =
    profile_filter && dermoProfile
      ? [...(dermoProfile.skinTypes ?? []), ...dermoProfile.skinConcerns]
      : []

  const filters: FilterValues<FilterKey> = Object.fromEntries(
    FILTER_KEYS.map((k) => [k, search[k] ?? []])
  ) as FilterValues<FilterKey>

  const { filterCount, activeTags, applyFilters, resetFilters, goToPage, toggleSingleFilter } =
    useListFilters({
      from: '/products/',
      filters,
      emptyFilters: EMPTY_FILTERS,
      filterKeys: FILTER_KEYS,
    })

  const hasPriceRange = hasActivePriceRange(priceMin, priceMax)
  const hasFilters = filterCount > 0
  const effectiveFilterCount =
    filterCount + (profile_filter ? 1 : 0) + (hasPriceRange ? 1 : 0) + (q ? 1 : 0)

  const handleReset = () => {
    resetFilters()
    navigate({ search: buildResetSearchParams, replace: true })
  }

  const { data: filterOptions } = useQuery(productQueries.filterOptions(category))

  const apiFilters: ListProductsFilters = buildProductsApiFilters({
    category,
    kind: search.kind ?? [],
    filters,
    avoidFor,
    sort,
    priceMin,
    priceMax,
    q,
    page,
    hasFilters,
  })

  // Random sort: keep result stable across back-nav so order doesn't reshuffle
  // (random() is non-deterministic — without staleTime, refetch yields a new sequence).
  const staleTime = sort === 'random' ? 5 * 60 * 1000 : hasFilters ? 5 * 60 * 1000 : 0
  const { data, isLoading, isPlaceholderData } = useQuery({
    ...productQueries.list(apiFilters),
    placeholderData: (prev) => prev,
    staleTime,
  })

  const filterGroups = useProductsFilterGroups(category, filterOptions)
  const extraChips = useProductsExtraChips({
    hasPriceRange,
    priceMin,
    priceMax,
    profileFilter: profile_filter,
    q,
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  const handleSortChange = (next: ProductSort) => {
    navigate({ search: (prev) => ({ ...prev, sort: next, page: 1 }), replace: true })
  }

  const handlePriceChange = ({ min, max }: { min?: number; max?: number }) => {
    navigate({
      search: (prev) => ({ ...prev, priceMin: min, priceMax: max, page: 1 }),
      replace: true,
    })
  }

  const handleProfileFilterChange = (checked: boolean) => {
    navigate({ search: (prev) => ({ ...prev, profile_filter: checked, page: 1 }) })
  }

  const handleDomainChange = (next: ProductDomainTab) => {
    startTransition(() => {
      navigate({
        search: (prev) => buildDomainSwitchSearch(prev, next, EMPTY_TAG_FILTERS),
        replace: true,
      })
    })
  }

  const handleAddProduct = useCallback((target: AddToCollectionTarget) => {
    setModalProduct(target)
  }, [])

  return (
    <>
      <div className="list-page products-page">
        <ProductsHeader
          total={total}
          hasFilters={hasFilters}
          isPlaceholderData={isPlaceholderData}
          sort={sort}
          onSortChange={handleSortChange}
          onOpenDrawer={() => setDrawerOpen(true)}
          effectiveFilterCount={effectiveFilterCount}
        />

        <div className="products-page__tabs">
          <Tabs
            options={DOMAIN_TAB_OPTIONS}
            activeTab={category}
            onTabChange={handleDomainChange}
            ariaLabel="Catégorie de produits"
          />
        </div>

        <ProductsActiveBar
          activeTags={activeTags}
          filterGroups={filterGroups}
          onRemoveTag={toggleSingleFilter}
          onClearAll={handleReset}
          extraChips={extraChips}
        />

        <ProductsFilterDrawerContent
          open={isDrawerOpen}
          onClose={() => setDrawerOpen(false)}
          groups={filterGroups}
          currentFilters={filters}
          initialFilters={EMPTY_FILTERS}
          onApply={applyFilters}
          onReset={handleReset}
          showProfileToggle={!!user && category === 'skincare'}
          profileFilter={profile_filter}
          onProfileFilterChange={handleProfileFilterChange}
          priceMin={priceMin}
          priceMax={priceMax}
          onPriceChange={handlePriceChange}
        />

        <section
          className={`list-main${isPlaceholderData ? ' list-main--syncing' : ''}`}
          aria-label="Liste des produits"
        >
          {isLoading && !isPlaceholderData ? (
            <EmptyState icon={<Package size={24} />} subtitle="Chargement..." />
          ) : items.length === 0 ? (
            effectiveFilterCount > 0 ? (
              <EmptyState
                icon={<Package size={24} />}
                title="Aucun produit ne correspond à vos filtres"
                subtitle="Essayez d'élargir vos critères ou de tout réinitialiser."
              >
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Tout effacer
                </Button>
              </EmptyState>
            ) : (
              <EmptyState
                icon={<Package size={24} />}
                title={`Aucun produit ${PRODUCT_DOMAIN_TAB_META[category].label.toLowerCase()} pour l'instant`}
                subtitle="Le catalogue s'enrichit régulièrement — revenez plus tard."
              />
            )
          ) : (
            <>
              <ul className="list-grid">
                {items.map((product) => (
                  <ProductCard key={product.id} product={product} onAdd={handleAddProduct} />
                ))}
              </ul>

              {totalPages > 1 && sort !== 'random' && (
                <ListPagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                />
              )}
            </>
          )}
        </section>
      </div>
      {modalProduct && (
        <AddToCollectionModal
          product={modalProduct}
          onClose={() => setModalProduct(null)}
          onSuccess={() => setModalProduct(null)}
        />
      )}
    </>
  )
}
