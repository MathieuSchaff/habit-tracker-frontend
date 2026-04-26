import {
  getProductKindLabel,
  PRODUCT_DOMAIN_TAB_META,
  PRODUCT_DOMAIN_TABS,
  PRODUCT_KINDS,
  PRODUCT_UNITS,
  type ProductDomainTab,
} from '@habit-tracker/shared'

import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, Package, Plus, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ProductIcon } from '@/assets/product-icons'
import { Button } from '@/component/Button/Button'
import { Card } from '@/component/Card/Card'
import { ListPagination } from '@/component/DataDisplay/Pagination/ListPagination'
import { EmptyState } from '@/component/Feedback/ui/EmptyState/EmptyState'
import {
  ActiveFiltersBar,
  type ExtraChip,
  emptyFilters,
  FilterDrawer,
  type FilterGroupConfig,
  type FilterValues,
  getFilterLabel,
} from '@/component/Filter'
import { Toggle } from '@/component/Input/Toggle/Toggle'
import { PageHeader } from '@/component/Layout/PageHeader/PageHeader'
import { SearchCombobox } from '@/component/Search/SearchCombobox'
import { type TabOption, Tabs } from '@/component/Tabs/Tabs'
import { SKIN_CONCERN_LABELS, SKIN_TYPE_LABELS } from '@/constants/skin'
import { AddToCollectionModal } from '@/features/products/components/AddToCollectionModal/AddToCollectionModal'
import { PriceRangeFilter } from '@/features/products/components/PriceRangeFilter/PriceRangeFilter'
import { SortControl } from '@/features/products/components/SortControl/SortControl'
import {
  FILTER_KEYS,
  type FilterKey,
  GROUP_LABELS,
  LABEL_OVERRIDES,
  NON_TAG_FILTER_LABELS,
  NON_TAG_FILTER_PLACEHOLDERS,
  TAG_FILTER_KEYS,
} from '@/features/products/filters'
import {
  buildDomainSwitchSearch,
  buildProductsApiFilters,
  buildResetSearchParams,
  hasActivePriceRange,
} from '@/features/products/helpers'
import { useListFilters } from '@/hooks/useListFilters'
import { useProductTagFilterGroups } from '@/hooks/useProductTagFilterGroups'
import { ingredientQueries } from '@/lib/queries/ingredients'
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

// Reverse lookup kind → category, derived from the shared taxonomy.
// Card hue is picked per product category; missing CSS rules fall back to default.
const KIND_TO_CATEGORY = Object.fromEntries(
  Object.entries(PRODUCT_KINDS).flatMap(([category, kinds]) =>
    Object.values(kinds).map((kind) => [kind, category])
  )
) as Record<string, string>

// Only categories with a dedicated CSS rule produce a category-specific class.
const CATEGORIES_WITH_HUE = new Set(['skincare', 'complement'])

const KNOWN_UNITS = new Set<string>(
  Object.values(PRODUCT_UNITS).flatMap((domain) => Object.values(domain))
)

function kindClass(kind: string): string {
  const category = KIND_TO_CATEGORY[kind]
  return category && CATEGORIES_WITH_HUE.has(category) ? `kind--${category}` : 'kind--default'
}

function unitClass(unit: string | null | undefined): string {
  const u = unit?.toLowerCase().trim() ?? ''
  return KNOWN_UNITS.has(u) ? `unit--${u}` : ''
}

const eurFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

const EMPTY_FILTERS = emptyFilters(FILTER_KEYS)

const DOMAIN_TAB_OPTIONS: TabOption<ProductDomainTab>[] = [...PRODUCT_DOMAIN_TABS]
  .sort((a, b) => PRODUCT_DOMAIN_TAB_META[a].order - PRODUCT_DOMAIN_TAB_META[b].order)
  .map((id) => ({ id, label: PRODUCT_DOMAIN_TAB_META[id].label }))

export function ProductsPage() {
  const [isDrawerOpen, setDrawerOpen] = useState(false)
  const [modalProduct, setModalProduct] = useState<{
    id: string
    name: string
    brand: string
    priceCents?: number | null
  } | null>(null)

  const search = routeApi.useSearch()
  const { page, profile_filter, sort, priceMin, priceMax, category } = search
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
  const effectiveFilterCount = filterCount + (profile_filter ? 1 : 0) + (hasPriceRange ? 1 : 0)

  const handleReset = () => {
    resetFilters()
    navigate({ search: buildResetSearchParams, replace: true })
  }

  const hasFilters = filterCount > 0

  const { data: filterOptions } = useQuery(productQueries.filterOptions(category))

  const apiFilters: ListProductsFilters = buildProductsApiFilters({
    category,
    kind: search.kind ?? [],
    filters,
    avoidFor,
    sort,
    priceMin,
    priceMax,
    page,
    hasFilters,
  })

  const handleSortChange = (next: ProductSort) => {
    navigate({ search: (prev) => ({ ...prev, sort: next, page: 1 }), replace: true })
  }

  const handlePriceChange = ({ min, max }: { min?: number; max?: number }) => {
    navigate({
      search: (prev) => ({ ...prev, priceMin: min, priceMax: max, page: 1 }),
      replace: true,
    })
  }

  // Random sort: keep result stable across back-nav so order doesn't reshuffle
  // (random() is non-deterministic — without staleTime, refetch yields a new sequence).
  const staleTime = sort === 'random' ? 5 * 60 * 1000 : hasFilters ? 5 * 60 * 1000 : 0
  const { data, isLoading, isPlaceholderData } = useQuery({
    ...productQueries.list(apiFilters),
    placeholderData: (prev) => prev,
    staleTime,
  })

  const tagGroups = useProductTagFilterGroups(category, filterOptions?.tagCounts, LABEL_OVERRIDES)

  const filterGroups = useMemo<FilterGroupConfig<FilterKey>[]>(() => {
    if (!filterOptions) return []

    return [
      ...(tagGroups as FilterGroupConfig<FilterKey>[]),
      {
        id: 'search',
        label: 'Recherche précise',
        defaultOpen: false,
        tier: 'advanced',
        subFilters: [
          {
            key: 'kind' as FilterKey,
            label: NON_TAG_FILTER_LABELS.kind,
            placeholder: NON_TAG_FILTER_PLACEHOLDERS.kind,
            options: filterOptions.kinds.map((k) => ({ value: k, label: getProductKindLabel(k) })),
          },
          {
            key: 'brand',
            label: NON_TAG_FILTER_LABELS.brand,
            placeholder: NON_TAG_FILTER_PLACEHOLDERS.brand,
            variant: 'search-select',
            options: filterOptions.brands.map((b) => ({ value: b, label: b })),
          },
          {
            key: 'ingredient',
            label: NON_TAG_FILTER_LABELS.ingredient,
            placeholder: NON_TAG_FILTER_PLACEHOLDERS.ingredient,
            variant: 'async-search-select',
            options: [],
            loadOptionsQuery: (q: string) => ({
              ...ingredientQueries.search(q),
              select: (data: { slug: string; name: string }[]) =>
                data.map((i) => ({ value: i.slug, label: i.name })),
            }),
            resolveValuesQuery: (slugs: string[]) => ({
              ...ingredientQueries.bySlugs(slugs),
              select: (data: { slug: string; name: string }[]) =>
                data.map((i) => ({ value: i.slug, label: i.name })),
            }),
          },
        ],
      },
    ]
  }, [filterOptions, tagGroups])

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  // Profile toggle is only meaningful on the skincare tab.
  const profileToggle =
    user && category === 'skincare' ? (
      <Toggle
        label="Selon mon profil"
        hint="Signale les produits déconseillés pour votre type de peau"
        checked={profile_filter}
        onChange={(checked) =>
          navigate({ search: (prev) => ({ ...prev, profile_filter: checked, page: 1 }) })
        }
        size="sm"
      />
    ) : null

  const extraChips: ExtraChip[] = []
  if (hasPriceRange) {
    const minLabel = priceMin != null ? eurFormatter.format(priceMin / 100) : null
    const maxLabel = priceMax != null ? eurFormatter.format(priceMax / 100) : null
    const label =
      minLabel && maxLabel
        ? `${minLabel} – ${maxLabel}`
        : minLabel
          ? `≥ ${minLabel}`
          : `≤ ${maxLabel}`
    extraChips.push({
      id: 'price',
      prefix: 'Prix',
      label,
      onRemove: () =>
        navigate({
          search: (prev) => ({ ...prev, priceMin: undefined, priceMax: undefined, page: 1 }),
          replace: true,
        }),
    })
  }
  if (profile_filter) {
    extraChips.push({
      id: 'profile',
      prefix: 'Profil',
      label: 'Selon mon profil',
      onRemove: () =>
        navigate({
          search: (prev) => ({ ...prev, profile_filter: false, page: 1 }),
          replace: true,
        }),
    })
  }

  const handleDomainChange = (next: ProductDomainTab) => {
    navigate({
      search: (prev) => buildDomainSwitchSearch(prev, next, EMPTY_TAG_FILTERS),
      replace: true,
    })
  }

  return (
    <>
      <div className="list-page products-page">
        <PageHeader
          title="Produits"
          isLoading={isPlaceholderData}
          meta={hasFilters ? `${total} produit${total > 1 ? 's' : ''}` : 'Découverte'}
          actions={
            <>
              <SearchCombobox
                label="Rechercher un produit"
                queryFn={productQueries.search}
                toResult={(item) => ({
                  id: item.id,
                  slug: item.slug,
                  label: item.name,
                  sublabel: item.brand,
                })}
                onSelect={(slug) => navigate({ to: '/products/$slug', params: { slug } })}
              />
              <div className="list-header__actions-group">
                <SortControl value={sort} onChange={handleSortChange} />
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => setDrawerOpen(true)}
                  className="list-filter-btn"
                  aria-label={
                    effectiveFilterCount > 0
                      ? `Filtrer (${effectiveFilterCount} actif${effectiveFilterCount > 1 ? 's' : ''})`
                      : 'Filtrer'
                  }
                >
                  <SlidersHorizontal size={14} aria-hidden="true" />
                  <span>Filtrer</span>
                  {effectiveFilterCount > 0 && (
                    <span className="list-filter-btn__count" aria-hidden="true">
                      {effectiveFilterCount}
                    </span>
                  )}
                </Button>
                <Button to="/products/new" variant="primary" size="md" className="list-filter-btn">
                  <Plus size={14} aria-hidden="true" />
                  <span>Créer</span>
                </Button>
              </div>
            </>
          }
        />

        <div className="products-page__tabs">
          <Tabs
            options={DOMAIN_TAB_OPTIONS}
            activeTab={category}
            onTabChange={handleDomainChange}
            ariaLabel="Catégorie de produits"
          />
        </div>

        <ActiveFiltersBar
          activeTags={activeTags}
          groupLabels={GROUP_LABELS}
          getFilterLabel={(key, value) => getFilterLabel(filterGroups, key, value)}
          onRemoveTag={toggleSingleFilter}
          onClearAll={handleReset}
          extraChips={extraChips}
        />

        <FilterDrawer
          open={isDrawerOpen}
          onClose={() => setDrawerOpen(false)}
          groups={filterGroups}
          currentFilters={filters}
          initialFilters={EMPTY_FILTERS}
          onApply={applyFilters}
          onReset={handleReset}
        >
          {profileToggle}
          <PriceRangeFilter min={priceMin} max={priceMax} onChange={handlePriceChange} />
        </FilterDrawer>

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
                  <Card
                    as="li"
                    key={product.id}
                    interactive
                    accent="var(--_kind-color)"
                    className={`list-card list-card--product ${kindClass(product.kind)} ${unitClass(product.unit)}`}
                  >
                    <div className="list-card__inner">
                      <Link
                        to="/products/$slug"
                        params={{ slug: product.slug }}
                        className="list-card__header"
                      >
                        <div className="list-card__header-top">
                          <div className="list-card__top-meta">
                            <span className="list-card__kind">
                              {getProductKindLabel(product.kind)}
                            </span>
                            {product.profileMatches.length > 0 && (
                              <span
                                className="list-card__avoid-badge"
                                title={`Déconseillé pour : ${product.profileMatches
                                  .map(
                                    (s) =>
                                      SKIN_TYPE_LABELS[s as keyof typeof SKIN_TYPE_LABELS] ??
                                      SKIN_CONCERN_LABELS[s as keyof typeof SKIN_CONCERN_LABELS] ??
                                      s
                                  )
                                  .join(', ')}`}
                              >
                                <AlertTriangle size={12} aria-hidden="true" />
                                Éviter
                              </span>
                            )}
                          </div>
                          <div className="list-card__icon-wrap" aria-hidden="true">
                            <ProductIcon unit={product.unit} kind={product.kind} size={18} />
                          </div>
                        </div>
                        <span className="list-card__brand">{product.brand}</span>
                        <Card.Title
                          as="p"
                          className="list-card__name"
                          style={{ viewTransitionName: `product-name-${product.slug}` }}
                        >
                          {product.name}
                        </Card.Title>
                      </Link>

                      <Card.Footer>
                        <div className="list-card__price-wrap">
                          {product.priceCents != null && product.priceCents > 0 ? (
                            <span className="list-card__price">
                              {eurFormatter.format(product.priceCents / 100)}
                            </span>
                          ) : (
                            <>
                              <span
                                className="list-card__price list-card__price--empty"
                                aria-hidden="true"
                              >
                                —
                              </span>
                              <span className="sr-only">Prix non renseigné</span>
                            </>
                          )}
                          {product.totalAmount != null && product.totalAmount > 0 && (
                            <span className="list-card__unit-chip">
                              {product.totalAmount} {product.amountUnit ?? product.unit}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          aria-label={`Ajouter ${product.name} à la collection`}
                          onClick={() => {
                            setModalProduct({
                              id: product.id,
                              name: product.name,
                              brand: product.brand,
                              priceCents: product.priceCents,
                            })
                          }}
                        >
                          <Plus size={14} aria-hidden="true" />
                          <span>Ajouter</span>
                        </Button>
                      </Card.Footer>
                    </div>
                  </Card>
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
