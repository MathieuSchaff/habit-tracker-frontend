import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { FlaskConical, Plus, SlidersHorizontal, Tag } from 'lucide-react'

import { Button } from '@/component/Button/Button'
import { PageHeader } from '@/component/Layout/PageHeader/PageHeader'
import { SearchCombobox, type SearchComboboxExtraEntry } from '@/component/Search/SearchCombobox'
import { foldText } from '@/component/Search/text-fold'
import { SortControl } from '@/features/products/components/SortControl/SortControl'
import { ingredientQueries } from '@/lib/queries/ingredients'
import { type ProductSort, productQueries } from '@/lib/queries/products'

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
            extraEntries={(q) => {
              const folded = foldText(q)
              if (folded.length < 2) return []
              const entries: SearchComboboxExtraEntry[] = []

              const brandMatch = brands.find((b) => foldText(b) === folded)
              if (brandMatch) {
                entries.push({
                  id: `brand:${brandMatch}`,
                  label: `Voir tous les produits ${brandMatch}`,
                  icon: <Tag size={14} aria-hidden="true" />,
                  onSelect: () =>
                    navigate({
                      to: '/products',
                      search: (prev) => ({ ...prev, brand: [brandMatch], page: 1 }),
                    }),
                })
              }

              const slugified = folded.replace(/\s+/g, '-')
              const ingredientMatch = ingredients.find(
                (i) => foldText(i.name) === folded || i.slug === slugified
              )
              if (ingredientMatch) {
                entries.push({
                  id: `ingredient:${ingredientMatch.slug}`,
                  label: `Voir tous les produits avec ${ingredientMatch.name}`,
                  icon: <FlaskConical size={14} aria-hidden="true" />,
                  onSelect: () =>
                    navigate({
                      to: '/products',
                      search: (prev) => ({
                        ...prev,
                        ingredient: [ingredientMatch.slug],
                        page: 1,
                      }),
                    }),
                })
              }

              return entries
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
