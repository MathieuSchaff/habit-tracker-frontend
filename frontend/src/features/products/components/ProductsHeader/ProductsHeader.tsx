import type { ProductDomainTab } from '@aurore/shared'

import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { FlaskConical, Plus, Search, SlidersHorizontal, Tag } from 'lucide-react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'

import { Button, ButtonLink } from '@/component/Button/Button'
import { ListBrowseHeader } from '@/component/Layout/PageLayout/ListBrowseHeader'
import type { ComboboxSection } from '@/component/Search/ComboboxPrimitive'
import { SearchCombobox } from '@/component/Search/SearchCombobox'
import { foldText } from '@/component/Search/text-fold'
import { type TabOption, Tabs } from '@/component/Tabs/Tabs'
import { SortControl } from '@/features/products/components/SortControl/SortControl'
import { TAB_INGREDIENT_TYPE } from '@/features/products/hooks/useProductsFilterGroups'
import { useDraggableY } from '@/hooks/useDraggableY'
import { ingredientQueries } from '@/lib/queries/ingredients'
import { type ProductSort, productQueries } from '@/lib/queries/products'

import '@/component/Layout/PageLayout/ListPage.css'

// Cap matches per facet to keep the dropdown scannable.
const FACET_SECTION_LIMIT = 2

type Props = {
  total: number
  hasFilters: boolean
  isPlaceholderData: boolean
  sort: ProductSort
  hasQuery: boolean
  onSortChange: (next: ProductSort) => void
  onOpenDrawer: () => void
  effectiveFilterCount: number
  activeTab: ProductDomainTab
  onTabChange: (next: ProductDomainTab) => void
  tabOptions: TabOption<ProductDomainTab>[]
  onFilterIntent?: () => void
}

function ProductsHeaderImpl({
  total,
  hasFilters,
  isPlaceholderData,
  sort,
  hasQuery,
  onSortChange,
  onOpenDrawer,
  effectiveFilterCount,
  activeTab,
  onTabChange,
  tabOptions,
  onFilterIntent,
}: Props) {
  const navigate = useNavigate({ from: '/products/' })
  // Search facet lists only matter once the combobox is engaged; gating on focus keeps
  // them off the cold-load waterfall (they competed with the LCP grid).
  const [searchActive, setSearchActive] = useState(false)
  // Facets scoped to the active tab: a cross-domain suggestion would navigate to a
  // silent 0-result list (category is ANDed server-side and kept on navigate).
  const { data: brands = [] } = useQuery({
    ...productQueries.brands(activeTab),
    enabled: searchActive,
  })
  const { data: ingredients = [] } = useQuery({
    ...ingredientQueries.options(TAB_INGREDIENT_TYPE[activeTab]),
    enabled: searchActive,
  })

  const [scrolled, setScrolled] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), { threshold: 0 })
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [])

  const sections = useCallback(
    (q: string): ComboboxSection[] => {
      const folded = foldText(q)
      if (folded.length < 2) return []
      const trimmed = q.trim()
      const slugFolded = folded.replace(/\s+/g, '-')

      const ingredientMatches = ingredients
        .filter((i) => foldText(i.name).includes(folded) || i.slug.includes(slugFolded))
        .slice(0, FACET_SECTION_LIMIT)

      const brandMatches = brands
        .filter((b) => foldText(b).includes(folded))
        .slice(0, FACET_SECTION_LIMIT)

      return [
        {
          id: 'ingredients',
          label: 'Ingrédients',
          items: ingredientMatches.map((i) => ({
            id: `ingredient:${i.slug}`,
            render: (
              <span className="search-combobox__section-entry">
                <FlaskConical size={14} aria-hidden="true" />
                <span>Voir tous les produits avec {i.name}</span>
              </span>
            ),
            onSelect: () =>
              navigate({
                to: '/products',
                // Drop any stale q: the label promises "all products with X", not "X AND q".
                search: (prev) => ({ ...prev, ingredient: [i.slug], q: undefined, page: 1 }),
              }),
          })),
        },
        {
          id: 'brands',
          label: 'Marques',
          items: brandMatches.map((b) => ({
            id: `brand:${b}`,
            render: (
              <span className="search-combobox__section-entry">
                <Tag size={14} aria-hidden="true" />
                <span>Voir tous les produits {b}</span>
              </span>
            ),
            onSelect: () =>
              navigate({
                to: '/products',
                search: (prev) => ({ ...prev, brand: [b], q: undefined, page: 1 }),
              }),
          })),
        },
        {
          id: 'fallback',
          label: 'Recherche',
          items: [
            {
              id: `query:${trimmed}`,
              render: (
                <span className="search-combobox__section-entry">
                  <Search size={14} aria-hidden="true" />
                  <span>Voir tous les résultats pour "{trimmed}"</span>
                </span>
              ),
              onSelect: () =>
                navigate({
                  to: '/products',
                  // sort reset: a fresh q defaults to relevance via productsSearchSchema.
                  search: (prev) => ({ ...prev, q: trimmed, page: 1, sort: undefined }),
                }),
            },
          ],
        },
      ]
    },
    [brands, ingredients, navigate]
  )

  return (
    <ListBrowseHeader
      title="Produits"
      meta={
        <>
          <strong>{total}</strong> {hasFilters ? `produit${total > 1 ? 's' : ''}` : 'en catalogue'}
        </>
      }
      metaBusy={isPlaceholderData}
      tools={
        <>
          <SortControl value={sort} onChange={onSortChange} hasQuery={hasQuery} compact />
          <ButtonLink
            to="/products/new"
            variant="ghost"
            size="md"
            className="list-browse-header__icon-btn"
            aria-label="Créer un produit"
            title="Créer un produit"
          >
            <Plus size={16} aria-hidden="true" />
          </ButtonLink>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onOpenDrawer}
            onPointerEnter={onFilterIntent}
            onFocus={onFilterIntent}
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
        </>
      }
      tabs={
        <Tabs
          options={tabOptions}
          activeTab={activeTab}
          onTabChange={onTabChange}
          variant="underline"
          scrollable
          ariaLabel="Catégorie de produits"
          hasPanels={false}
        />
      }
      search={
        <SearchCombobox
          label="Rechercher un produit"
          queryFn={(q) => productQueries.search(q, activeTab)}
          toResult={(item) => ({
            id: item.id,
            slug: item.slug,
            label: item.name,
            sublabel: item.brand,
          })}
          onSelect={(slug) => navigate({ to: '/products/$slug', params: { slug } })}
          onFocus={() => setSearchActive(true)}
          sections={sections}
          onSubmitQuery={(q) => {
            const trimmed = q.trim()
            if (trimmed.length === 0) return
            navigate({
              to: '/products',
              // sort reset: a fresh q defaults to relevance via productsSearchSchema.
              search: (prev) => ({ ...prev, q: trimmed, page: 1, sort: undefined }),
            })
          }}
        />
      }
    >
      <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />

      <FloatingFilterButton
        visible={scrolled}
        count={effectiveFilterCount}
        onClick={onOpenDrawer}
        onIntent={onFilterIntent}
      />
    </ListBrowseHeader>
  )
}

export const ProductsHeader = memo(ProductsHeaderImpl)

type FloatingFilterButtonProps = {
  visible: boolean
  count: number
  onClick: () => void
  onIntent?: () => void
}

const FLOATING_FILTER_Y_KEY = 'products-floating-filter-y'
const PILL_HALF_HEIGHT = 28
const EDGE_BUFFER = 8

function computeFloatingFilterBounds() {
  if (typeof window === 'undefined') return { minY: 0, maxY: 0 }
  const halfV = window.innerHeight / 2
  // Mobile-only: desktop has no bottom-nav rendered.
  const nav = document.querySelector<HTMLElement>('.bottom-nav')
  const navH = nav?.getBoundingClientRect().height ?? 0
  return {
    minY: -(halfV - PILL_HALF_HEIGHT - EDGE_BUFFER),
    maxY: halfV - PILL_HALF_HEIGHT - EDGE_BUFFER - navH,
  }
}

function FloatingFilterButton({ visible, count, onClick, onIntent }: FloatingFilterButtonProps) {
  const { y, dragging, dragHandlers, withClickGuard } = useDraggableY({
    storageKey: FLOATING_FILTER_Y_KEY,
    computeBounds: computeFloatingFilterBounds,
    enabled: visible,
  })

  return (
    <button
      type="button"
      className={`products-floating-filter${visible ? ' products-floating-filter--visible' : ''}${dragging ? ' products-floating-filter--dragging' : ''}`}
      style={{ '--drag-y': `${y}px` } as React.CSSProperties}
      aria-label={`Filtrer${count > 0 ? ` (${count} actif${count > 1 ? 's' : ''})` : ''}`}
      tabIndex={visible ? 0 : -1}
      {...dragHandlers}
      onPointerEnter={onIntent}
      onFocus={onIntent}
      onClick={withClickGuard(onClick)}
    >
      <span className="products-floating-filter__icon-wrap">
        <SlidersHorizontal size={18} aria-hidden="true" />
        {count > 0 && (
          <span className="products-floating-filter__count" aria-hidden="true">
            {count}
          </span>
        )}
      </span>
      <span className="products-floating-filter__label">Filtrer</span>
    </button>
  )
}
