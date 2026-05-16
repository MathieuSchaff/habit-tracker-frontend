import {
  PRODUCT_DOMAIN_TAB_META,
  PRODUCT_DOMAIN_TABS,
  type ProductDomainTab,
} from '@habit-tracker/shared'

import { useQuery } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Package } from 'lucide-react'
import { startTransition, useCallback, useMemo, useState } from 'react'

import { Button } from '@/component/Button/Button'
import { ListPagination } from '@/component/DataDisplay/Pagination/ListPagination'
import { EmptyState } from '@/component/Feedback/ui/EmptyState/EmptyState'
import { emptyFilters, type FilterValues } from '@/component/Filter'
import { ListPageLayout } from '@/component/Layout'
import type { TabOption } from '@/component/Tabs/Tabs'
import { AddToCollectionModal } from '@/features/products/components/AddToCollectionModal/AddToCollectionModal'
import { CollapsibleFiltersStrip } from '@/features/products/components/CollapsibleFiltersStrip/CollapsibleFiltersStrip'
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
import './ProductsPage.css'
import '@/features/products/styles/kinds.css'

const routeApi = getRouteApi('/products/')

// Tag keys only — domain switch resets tags; brand/ingredient carry over via buildDomainSwitchSearch.
const EMPTY_TAG_FILTERS = emptyFilters(TAG_FILTER_KEYS)

const EMPTY_FILTERS = emptyFilters(FILTER_KEYS)

const DOMAIN_TAB_OPTIONS: TabOption<ProductDomainTab>[] = [...PRODUCT_DOMAIN_TABS]
  .sort((a, b) => PRODUCT_DOMAIN_TAB_META[a].order - PRODUCT_DOMAIN_TAB_META[b].order)
  .map((id) => ({ id, label: PRODUCT_DOMAIN_TAB_META[id].label }))

export function ProductsPage() {
  const [isDrawerOpen, setDrawerOpen] = useState(false)
  const [draftFilters, setDraftFilters] = useState<FilterValues<FilterKey> | null>(null)
  const [modalProduct, setModalProduct] = useState<AddToCollectionTarget | null>(null)

  const search = routeApi.useSearch()
  const { page, profile_filter, sort, priceMin, priceMax, category, q } = search
  const navigate = useNavigate({ from: '/products/' })

  const user = useAuthStore((s) => s.user)

  const { data: dermoProfile } = useQuery({
    ...profileQueries.dermo(),
    enabled: !!user && profile_filter,
  })

  const avoidFor = useMemo(
    () =>
      profile_filter && dermoProfile
        ? [...(dermoProfile.skinTypes ?? []), ...dermoProfile.skinConcerns]
        : [],
    [profile_filter, dermoProfile]
  )

  // Stable ref: a fresh object every render feeds back into setDraftFilters and loops.
  const filters = useMemo<FilterValues<FilterKey>>(
    () =>
      Object.fromEntries(FILTER_KEYS.map((k) => [k, search[k] ?? []])) as FilterValues<FilterKey>,
    [search]
  )

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

  const handleReset = useCallback(() => {
    resetFilters()
    navigate({ search: buildResetSearchParams, replace: true })
  }, [resetFilters, navigate])

  const { data: filterOptions } = useQuery(productQueries.filterOptions(category))

  const apiFilters = useMemo<ListProductsFilters>(
    () =>
      buildProductsApiFilters({
        category,
        filters,
        avoidFor,
        sort,
        priceMin,
        priceMax,
        q,
        page,
        hasFilters,
      }),
    [category, filters, avoidFor, sort, priceMin, priceMax, q, page, hasFilters]
  )

  // Random sort: staleTime keeps order stable across back-nav (refetch reshuffles otherwise).
  const staleTime = sort === 'random' || hasFilters ? 5 * 60 * 1000 : 0
  const userKey = user?.id ?? null
  const { data, isLoading, isPlaceholderData } = useQuery({
    ...productQueries.list(apiFilters, userKey),
    placeholderData: (prev) => prev,
    staleTime,
  })

  // Live count for the drawer's in-flight selection; only runs while drawer is open.
  const previewApiFilters = useMemo<ListProductsFilters>(
    () =>
      buildProductsApiFilters({
        category,
        filters: draftFilters ?? filters,
        avoidFor,
        sort,
        priceMin,
        priceMax,
        q,
        page: 1,
        hasFilters: true,
      }),
    [category, draftFilters, filters, avoidFor, sort, priceMin, priceMax, q]
  )
  const { data: previewData } = useQuery({
    ...productQueries.list(previewApiFilters, userKey),
    enabled: isDrawerOpen,
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  })
  const previewCount = isDrawerOpen ? previewData?.total : undefined

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

  const handleSortChange = useCallback(
    (next: ProductSort) => {
      navigate({ search: (prev) => ({ ...prev, sort: next, page: 1 }), replace: true })
    },
    [navigate]
  )

  const handlePriceChange = useCallback(
    ({ min, max }: { min?: number; max?: number }) => {
      navigate({
        search: (prev) => ({ ...prev, priceMin: min, priceMax: max, page: 1 }),
        replace: true,
      })
    },
    [navigate]
  )

  const handleProfileFilterChange = useCallback(
    (checked: boolean) => {
      navigate({ search: (prev) => ({ ...prev, profile_filter: checked, page: 1 }) })
    },
    [navigate]
  )

  const handleDomainChange = useCallback(
    (next: ProductDomainTab) => {
      // URL tag filters reset via buildDomainSwitchSearch; draftFilters is local state and must too.
      setDraftFilters(null)
      startTransition(() => {
        navigate({
          search: (prev) => buildDomainSwitchSearch(prev, next, EMPTY_TAG_FILTERS),
          replace: true,
        })
      })
    },
    [navigate]
  )

  const handleAddProduct = useCallback((target: AddToCollectionTarget) => {
    setModalProduct(target)
  }, [])

  const handleOpenDrawer = useCallback(() => setDrawerOpen(true), [])
  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false)
    setDraftFilters(null)
  }, [])
  const handleCloseModal = useCallback(() => setModalProduct(null), [])

  return (
    <>
      <ListPageLayout className="products-page">
        <ListPageLayout.Header fullBleed>
          <ProductsHeader
            total={total}
            hasFilters={hasFilters}
            isPlaceholderData={isPlaceholderData}
            sort={sort}
            onSortChange={handleSortChange}
            onOpenDrawer={handleOpenDrawer}
            effectiveFilterCount={effectiveFilterCount}
            activeTab={category}
            onTabChange={handleDomainChange}
            tabOptions={DOMAIN_TAB_OPTIONS}
          />

          <CollapsibleFiltersStrip count={effectiveFilterCount} onOpenDrawer={handleOpenDrawer}>
            <ProductsActiveBar
              activeTags={activeTags}
              filterGroups={filterGroups}
              onRemoveTag={toggleSingleFilter}
              onClearAll={handleReset}
              extraChips={extraChips}
            />
          </CollapsibleFiltersStrip>
        </ListPageLayout.Header>

        <ProductsFilterDrawerContent
          open={isDrawerOpen}
          onClose={handleCloseDrawer}
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
          previewCount={previewCount}
          onLocalFiltersChange={setDraftFilters}
        />

        <ListPageLayout.Body maxWidth="72rem" isSyncing={isPlaceholderData}>
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
        </ListPageLayout.Body>
      </ListPageLayout>
      {modalProduct && (
        <AddToCollectionModal
          product={modalProduct}
          onClose={handleCloseModal}
          onSuccess={handleCloseModal}
        />
      )}
    </>
  )
}
