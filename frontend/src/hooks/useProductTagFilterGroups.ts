import {
  type AllProductTagCategory,
  DENTAL_PRODUCT_TAG_CATEGORY_META,
  DOMAIN_PRODUCT_FILTER_CATEGORIES,
  getProductTagsByCategory,
  HAIRCARE_PRODUCT_TAG_CATEGORY_META,
  type ProductDomainTab,
  SKINCARE_PRODUCT_TAG_CATEGORY_META,
  SUPPLEMENT_PRODUCT_TAG_CATEGORY_META,
  type TagCategoryMeta,
} from '@habit-tracker/shared'

import { useMemo } from 'react'

import type { FilterGroupConfig, FilterOption } from '@/component/Filter'

const DOMAIN_TAG_META: Record<ProductDomainTab, Record<string, TagCategoryMeta>> = {
  skincare: SKINCARE_PRODUCT_TAG_CATEGORY_META,
  haircare: HAIRCARE_PRODUCT_TAG_CATEGORY_META,
  dental: DENTAL_PRODUCT_TAG_CATEGORY_META,
  complement: SUPPLEMENT_PRODUCT_TAG_CATEGORY_META,
}

/**
 * Build product filter accordions from the shared taxonomy. The drawer always
 * shows every category × slug defined in `shared/`, regardless of what is
 * currently seeded in the DB; the API only contributes `tagCounts` so chips
 * with zero matching products render disabled.
 */
export function useProductTagFilterGroups(
  domain: ProductDomainTab,
  tagCounts: Record<string, number> | undefined,
  labelOverrides: Record<string, string> = {}
): FilterGroupConfig<AllProductTagCategory>[] {
  return useMemo(() => {
    const categories = DOMAIN_PRODUCT_FILTER_CATEGORIES[domain]
    const meta = DOMAIN_TAG_META[domain]
    const counts = tagCounts ?? {}

    return categories.map((cat) => {
      const catMeta = meta[cat]
      const options: FilterOption[] = getProductTagsByCategory(domain, cat)
        .map(({ slug, label }) => {
          const count = counts[slug] ?? 0
          return {
            value: slug,
            label: labelOverrides[slug] ?? label,
            count,
            disabled: count === 0,
          }
        })
        .sort((a, b) => a.label.localeCompare(b.label, 'fr'))

      return {
        id: cat,
        label: catMeta.label,
        defaultOpen: catMeta.tier === 'essential',
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
  }, [domain, tagCounts, labelOverrides])
}
