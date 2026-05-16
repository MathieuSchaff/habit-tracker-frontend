import {
  type AllIngredientTagCategory,
  DOMAIN_INGREDIENT_FILTER_CATEGORIES,
  getIngredientTagsByCategory,
  type IngredientFilterOptionsTag,
  type IngredientType,
} from '@habit-tracker/shared'

import { useMemo } from 'react'

import type { FilterGroupConfig, FilterOption } from '@/component/Filter'
import { DOMAIN_TAG_META } from '@/features/ingredients/filters'

/**
 * Always render every (category, slug) defined in `shared/` for the domain.
 * The API only contributes labels and counts; slugs absent from the API
 * render disabled with count 0.
 */
export function useIngredientTagFilterGroups(
  domain: IngredientType,
  tags: IngredientFilterOptionsTag[] | undefined
): FilterGroupConfig<AllIngredientTagCategory>[] {
  return useMemo(() => {
    const categories = DOMAIN_INGREDIENT_FILTER_CATEGORIES[domain]
    const meta = DOMAIN_TAG_META[domain]

    const tagBySlug = new Map<string, IngredientFilterOptionsTag>()
    for (const t of tags ?? []) tagBySlug.set(t.slug, t)

    return categories.map((cat) => {
      const catMeta = meta[cat]
      const options: FilterOption[] = getIngredientTagsByCategory(domain, cat)
        .map(({ slug }) => {
          const row = tagBySlug.get(slug)
          const count = row?.count ?? 0
          return {
            value: slug,
            label: row?.name ?? slug,
            count,
            disabled: count === 0,
          }
        })
        .sort((a, b) => a.label.localeCompare(b.label, 'fr'))

      return {
        id: cat,
        label: catMeta.label,
        defaultOpen: catMeta.defaultOpen ?? catMeta.tier === 'essential',
        tier: catMeta.tier,
        subFilters: [
          {
            key: cat,
            label: catMeta.label,
            placeholder: catMeta.placeholder,
            options,
          },
        ],
      }
    })
  }, [domain, tags])
}
