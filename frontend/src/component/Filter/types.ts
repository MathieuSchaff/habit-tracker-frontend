import type { UseQueryOptions } from '@tanstack/react-query'

export type FilterOption = {
  value: string
  label: string
  count?: number
  // Per-option disabled flag (e.g. count=0 in shared-driven product filters).
  // ChipGroup applies the same visual treatment as group-level disabled and
  // blocks toggling.
  disabled?: boolean
}

// `TFnData` is the raw row shape returned by the API, mapped to FilterOption[]
// by an optional `select`. Defaults to FilterOption[] so callers can skip
// generics when their queryFn already returns the right shape. The QueryKey
// generic is left as `any` to sidestep contravariance: a factory returning
// `UseQueryOptions<..., readonly ["specific", "tuple"]>` would otherwise fail
// to assign to a parameter typed with the wider `QueryKey`.
export type AsyncSearchQueryFactory<TInput, TFnData = FilterOption[]> = (
  input: TInput
  // biome-ignore lint/suspicious/noExplicitAny: see comment above
) => UseQueryOptions<TFnData, Error, FilterOption[], any>

export type FilterFieldConfig<T extends string> = {
  key: T
  label: string
  placeholder: string
  // `options` is required for static variants (`chips`, `search-select`).
  // The async variant ignores it and uses the loader callbacks instead — kept
  // permissive at the type level to avoid a discriminated union explosion in
  // FilterAccordion's mapping logic.
  options: FilterOption[]
  variant?: 'chips' | 'search-select' | 'async-search-select'
  // Only used when `variant === 'async-search-select'`. TFnData is left open
  // (`any`) so adapters mapping a raw API row shape to FilterOption[] via
  // `select` can be assigned without forcing every caller to widen TFnData.
  // biome-ignore lint/suspicious/noExplicitAny: see comment above
  loadOptionsQuery?: AsyncSearchQueryFactory<string, any>
  // biome-ignore lint/suspicious/noExplicitAny: see comment above
  resolveValuesQuery?: AsyncSearchQueryFactory<string[], any>
}

export type FilterValues<T extends string> = Record<T, string[]>

export type FilterSubGroup = {
  label: string
  slugs: string[]
  maxVisible?: number
}

export type GroupedFilterField<T extends string> = FilterFieldConfig<T> & {
  subGroups?: FilterSubGroup[]
}

export type FilterGroupConfig<T extends string> = {
  id: string
  label: string
  defaultOpen: boolean
  tier: 'essential' | 'advanced'
  subFilters: GroupedFilterField<T>[]
}
