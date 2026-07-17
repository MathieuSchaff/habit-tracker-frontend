import type { IngredientType, ProductDomainTab } from '@aurore/shared'

import { useMemo } from 'react'

import type { FilterGroupConfig } from '@/component/Filter'
import {
  type FilterKey,
  NON_TAG_FILTER_LABELS,
  NON_TAG_FILTER_PLACEHOLDERS,
} from '@/features/products/filters'
import { useProductTagFilterGroups } from '@/hooks/useProductTagFilterGroups'
import { ingredientQueries } from '@/lib/queries/ingredients'

type FilterOptions = {
  kinds: string[]
  brands: string[]
  tagCounts: Record<string, number>
}

type IngredientLookupRow = { slug: string; name: string }
const toIngredientOption = (i: IngredientLookupRow) => ({ value: i.slug, label: i.name })

// Tab and ingredient domains match 1:1 except tab "complement" → type "supplement".
// Exported: ProductsHeader scopes its facet suggestions with the same mapping.
export const TAB_INGREDIENT_TYPE: Record<ProductDomainTab, IngredientType> = {
  skincare: 'skincare',
  haircare: 'haircare',
  dental: 'dental',
  complement: 'supplement',
}

const loadIngredientOptions = (type: IngredientType) => (q: string) => ({
  ...ingredientQueries.search(q, type),
  select: (data: IngredientLookupRow[]) => data.map(toIngredientOption),
})

const resolveIngredientValues = (slugs: string[]) => ({
  ...ingredientQueries.bySlugs(slugs),
  select: (data: IngredientLookupRow[]) => data.map(toIngredientOption),
})

export function useProductsFilterGroups(
  category: ProductDomainTab,
  filterOptions: FilterOptions | undefined
): FilterGroupConfig<FilterKey>[] {
  const tagGroups = useProductTagFilterGroups(category, filterOptions?.tagCounts)

  return useMemo<FilterGroupConfig<FilterKey>[]>(() => {
    if (!filterOptions) return []

    return [
      ...(tagGroups as FilterGroupConfig<FilterKey>[]),
      // Essential tier for dermo-informed users. Closed by default - async search is heavier than chip groups.
      {
        id: 'ingredient',
        label: NON_TAG_FILTER_LABELS.ingredient,
        defaultOpen: false,
        tier: 'essential',
        inline: true,
        subFilters: [
          {
            key: 'ingredient',
            label: NON_TAG_FILTER_LABELS.ingredient,
            placeholder: NON_TAG_FILTER_PLACEHOLDERS.ingredient,
            variant: 'async-search-select',
            options: [],
            loadOptionsQuery: loadIngredientOptions(TAB_INGREDIENT_TYPE[category]),
            resolveValuesQuery: resolveIngredientValues,
          },
        ],
      },
      {
        id: 'search',
        label: 'Recherche précise',
        defaultOpen: false,
        tier: 'advanced',
        inline: true,
        subFilters: [
          {
            key: 'brand',
            label: NON_TAG_FILTER_LABELS.brand,
            placeholder: NON_TAG_FILTER_PLACEHOLDERS.brand,
            variant: 'search-select',
            options: filterOptions.brands.map((b) => ({ value: b, label: b })),
          },
        ],
      },
    ]
  }, [filterOptions, tagGroups, category])
}
