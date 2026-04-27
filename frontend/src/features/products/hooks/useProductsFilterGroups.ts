import { getProductKindLabel, type ProductDomainTab } from '@habit-tracker/shared'

import { useMemo } from 'react'

import type { FilterGroupConfig } from '@/component/Filter'
import {
  type FilterKey,
  LABEL_OVERRIDES,
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

export function useProductsFilterGroups(
  category: ProductDomainTab,
  filterOptions: FilterOptions | undefined
): FilterGroupConfig<FilterKey>[] {
  const tagGroups = useProductTagFilterGroups(category, filterOptions?.tagCounts, LABEL_OVERRIDES)

  return useMemo<FilterGroupConfig<FilterKey>[]>(() => {
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
}
