import type { SkincareProductTagSlug } from '@aurore/shared'

import type { FilterGroupConfig, FilterValues } from '@/component/Filter/types'
import { type FilterKey, tagLabel } from '@/features/products/filters'

export type SearchIntent = {
  id: string
  label: string
  filters: Partial<Record<FilterKey, SkincareProductTagSlug[]>>
}

export const SEARCH_INTENTS: SearchIntent[] = [
  {
    id: 'cream-moisturizer',
    label: 'Crème hydratante',
    filters: {
      product_type_v2: ['type-hydratant'],
      texture: ['texture-creme'],
    },
  },
  {
    id: 'gel-cleanser',
    label: 'Gel nettoyant',
    filters: {
      product_type_v2: ['type-nettoyant'],
      texture: ['texture-gel'],
    },
  },
  {
    id: 'face-cleanser',
    label: 'Nettoyant visage',
    filters: {
      product_type_v2: ['type-nettoyant'],
      skin_zone: ['zone-visage'],
    },
  },
  {
    id: 'sunscreen-cream',
    label: 'Crème solaire',
    filters: {
      product_type_v2: ['type-solaire'],
      texture: ['texture-creme'],
    },
  },
  {
    id: 'serum',
    label: 'Sérum',
    filters: {
      product_type_v2: ['type-serum'],
    },
  },
  {
    id: 'body-milk',
    label: 'Lait corps',
    filters: {
      texture: ['texture-lait'],
      skin_zone: ['zone-corps'],
    },
  },
]

// Derive the "Nettoyant + Gel" hint from the taxonomy labels of the preset's
// slugs, in filter-axis order, so it can't drift from the canonical labels.
export function intentDetail(intent: SearchIntent) {
  return Object.values(intent.filters)
    .flat()
    .map((slug) => tagLabel(slug))
    .join(' + ')
}

function arraysMatch(actual: string[] | undefined, expected: string[]) {
  return actual?.length === expected.length && expected.every((value) => actual.includes(value))
}

export function inferActiveIntent(filters: FilterValues<FilterKey>) {
  const filledAxes = Object.values(filters).filter((values) => values.length > 0).length
  return SEARCH_INTENTS.find((intent) => {
    const presetAxes = Object.keys(intent.filters)
    // Exact match: every preset axis matches AND no axis is filled beyond
    // the preset, so overlapping presets can't both claim the same filters.
    return (
      filledAxes === presetAxes.length &&
      presetAxes.every((key) =>
        arraysMatch(filters[key as FilterKey], intent.filters[key as FilterKey] ?? [])
      )
    )
  })
}

export function applySearchIntent(filters: FilterValues<FilterKey>, intent: SearchIntent) {
  const activeIntent = inferActiveIntent(filters)
  const next = { ...filters }

  if (activeIntent) {
    for (const key of Object.keys(activeIntent.filters) as FilterKey[]) {
      next[key] = []
    }
  }

  if (activeIntent?.id !== intent.id) {
    for (const [key, values] of Object.entries(intent.filters)) {
      next[key as FilterKey] = [...(values ?? [])]
    }
  }

  return next
}

export function isSearchIntentAvailable(
  intent: SearchIntent,
  groups: FilterGroupConfig<FilterKey>[]
) {
  return Object.entries(intent.filters).every(([key, values]) =>
    (values ?? []).every((value) =>
      groups.some((group) =>
        group.subFilters.some(
          (field) =>
            field.key === key &&
            field.options.some((option) => option.value === value && !option.disabled)
        )
      )
    )
  )
}
