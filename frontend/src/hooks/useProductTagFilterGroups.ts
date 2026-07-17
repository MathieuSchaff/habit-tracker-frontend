import {
  type AllProductTagCategory,
  getProductFilterDefinition,
  type ProductDomainTab,
} from '@aurore/shared'

import { useMemo } from 'react'

import type { FilterGroupConfig, FilterOption } from '@/component/Filter'

/**
 * Always render every category × slug defined in `shared/`, regardless of
 * what is currently seeded. The API only contributes `tagCounts`; chips
 * with zero matching products render disabled.
 */
export function useProductTagFilterGroups(
  domain: ProductDomainTab,
  tagCounts: Record<string, number> | undefined
): FilterGroupConfig<AllProductTagCategory>[] {
  return useMemo(() => {
    const counts = tagCounts ?? {}
    return getProductFilterDefinition(domain).map((definition) => {
      const options: FilterOption[] = definition.options.map((option) => {
        const count = counts[option.value] ?? 0
        return { ...option, count, disabled: count === 0 }
      })

      return {
        id: definition.key,
        label: definition.label,
        defaultOpen: definition.defaultOpen,
        tier: definition.tier,
        subFilters: [
          {
            key: definition.key,
            label: definition.label,
            placeholder: definition.placeholder,
            options,
            subGroups: definition.subGroups,
          },
        ],
      }
    })
  }, [domain, tagCounts])
}
