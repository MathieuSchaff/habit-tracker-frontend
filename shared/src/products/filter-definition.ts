import type { FilterTier, TagCategoryMeta } from '../core'
import { DENTAL_PRODUCT_TAG_CATEGORY_META } from './dental/tag-filters'
import type { ProductDomainTab } from './domain-tabs'
import { HAIRCARE_PRODUCT_TAG_CATEGORY_META } from './haircare/tag-filters'
import {
  type AllProductTagCategory,
  DOMAIN_PRODUCT_FILTER_CATEGORIES,
  getProductTagsByCategory,
} from './helpers'
import { SKINCARE_PRODUCT_TAG_CATEGORY_META } from './skincare/tag-filters'
import {
  SKINCARE_PRODUCT_CHARACTERISTIC_GROUPS,
  SKINCARE_PRODUCT_CONCERN_GROUPS,
} from './skincare/tag-taxonomy'
import { SUPPLEMENT_PRODUCT_TAG_CATEGORY_META } from './supplement/tag-filters'

export type ProductFilterDefinition = {
  key: AllProductTagCategory
  label: string
  placeholder: string
  tier: FilterTier
  defaultOpen: boolean
  options: ProductFilterOptionDefinition[]
  subGroups?: ProductFilterSubGroupDefinition[]
}

export type ProductFilterOptionDefinition = {
  value: string
  label: string
}

export type ProductFilterSubGroupDefinition = {
  label: string
  slugs: string[]
}

const DOMAIN_TAG_META: Record<ProductDomainTab, Record<string, TagCategoryMeta>> = {
  skincare: SKINCARE_PRODUCT_TAG_CATEGORY_META,
  haircare: HAIRCARE_PRODUCT_TAG_CATEGORY_META,
  dental: DENTAL_PRODUCT_TAG_CATEGORY_META,
  complement: SUPPLEMENT_PRODUCT_TAG_CATEGORY_META,
}

const SKINCARE_SEMANTIC_OPTION_CATEGORIES = new Set<AllProductTagCategory>([
  'product_type_v2',
  'texture',
  'skin_zone',
  'routine_step_v2',
  'routine_moment',
])

const SKINCARE_SUBGROUPS: Partial<
  Record<AllProductTagCategory, ProductFilterSubGroupDefinition[]>
> = {
  concern: [
    {
      label: 'Problèmes fonctionnels',
      slugs: [...SKINCARE_PRODUCT_CONCERN_GROUPS.functional],
    },
    {
      label: 'Objectifs esthétiques',
      slugs: [...SKINCARE_PRODUCT_CONCERN_GROUPS.aesthetic],
    },
  ],
  product_characteristic: [
    {
      label: 'Tolérance & sécurité',
      slugs: [...SKINCARE_PRODUCT_CHARACTERISTIC_GROUPS.tolerance],
    },
    {
      label: 'Labels et engagements',
      slugs: [...SKINCARE_PRODUCT_CHARACTERISTIC_GROUPS.ethique],
    },
    {
      label: 'Technique',
      slugs: [...SKINCARE_PRODUCT_CHARACTERISTIC_GROUPS.technique],
    },
    {
      label: 'Comédogénicité',
      slugs: [...SKINCARE_PRODUCT_CHARACTERISTIC_GROUPS.comedogenicite],
    },
  ],
}

export function getProductFilterDefinition(domain: ProductDomainTab): ProductFilterDefinition[] {
  return DOMAIN_PRODUCT_FILTER_CATEGORIES[domain].map((key) => {
    const meta = DOMAIN_TAG_META[domain][key]
    if (!meta) throw new Error(`Missing ${domain} product filter metadata for ${key}`)
    const options = getProductTagsByCategory(domain, key).map(({ slug, label }) => ({
      value: slug,
      label,
    }))
    if (domain !== 'skincare' || !SKINCARE_SEMANTIC_OPTION_CATEGORIES.has(key)) {
      options.sort((a, b) => a.label.localeCompare(b.label, 'fr'))
    }
    return {
      key,
      label: meta.label,
      placeholder: meta.placeholder,
      tier: meta.tier,
      defaultOpen: meta.defaultOpen ?? meta.tier === 'essential',
      options,
      subGroups: domain === 'skincare' ? SKINCARE_SUBGROUPS[key] : undefined,
    }
  })
}
