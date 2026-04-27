import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { FlaskConical, Plus, Search, SlidersHorizontal, Tag } from 'lucide-react'

import { Button } from '@/component/Button/Button'
import { PageHeader } from '@/component/Layout/PageHeader/PageHeader'
import type { ComboboxSection } from '@/component/Search/ComboboxPrimitive'
import { SearchCombobox } from '@/component/Search/SearchCombobox'
import { foldText } from '@/component/Search/text-fold'
import { SortControl } from '@/features/products/components/SortControl/SortControl'
import { ingredientQueries } from '@/lib/queries/ingredients'
import { type ProductSort, productQueries } from '@/lib/queries/products'

// Sections cap: keep the dropdown scannable. Top N matches per facet by
// alphabetical order — matches are rare enough that ranking has little payoff.
const FACET_SECTION_LIMIT = 3

type Props = {
  total: number
  hasFilters: boolean
  isPlaceholderData: boolean
  sort: ProductSort
  onSortChange: (next: ProductSort) => void
  onOpenDrawer: () => void
  effectiveFilterCount: number
}

export function ProductsHeader({
  total,
  hasFilters,
  isPlaceholderData,
  sort,
  onSortChange,
  onOpenDrawer,
  effectiveFilterCount,
}: Props) {
  const navigate = useNavigate({ from: '/products/' })
  const { data: brands = [] } = useQuery(productQueries.brands())
  const { data: ingredients = [] } = useQuery(ingredientQueries.options())

  return (
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
            sections={(q) => {
              const folded = foldText(q)
              if (folded.length < 2) return []
              const trimmed = q.trim()

              // Ingredient matches: name OR slug contains folded query (substring,
              // accent-insensitive). Section ordered first because ingredient intent
              // is the most specific facet (rétinol, niacinamide…).
              const slugFolded = folded.replace(/\s+/g, '-')
              const ingredientMatches = ingredients
                .filter((i) => foldText(i.name).includes(folded) || i.slug.includes(slugFolded))
                .slice(0, FACET_SECTION_LIMIT)

              const brandMatches = brands
                .filter((b) => foldText(b).includes(folded))
                .slice(0, FACET_SECTION_LIMIT)

              const sections: ComboboxSection[] = [
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
                        search: (prev) => ({ ...prev, ingredient: [i.slug], page: 1 }),
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
                        search: (prev) => ({ ...prev, brand: [b], page: 1 }),
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
                          search: (prev) => ({ ...prev, q: trimmed, page: 1 }),
                        }),
                    },
                  ],
                },
              ]

              return sections
            }}
          />
          <div className="list-header__actions-group">
            <SortControl value={sort} onChange={onSortChange} />
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={onOpenDrawer}
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
  )
}
