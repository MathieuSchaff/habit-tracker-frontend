import type { UseQueryOptions } from '@tanstack/react-query'

export type FilterOption = {
  value: string
  label: string
  count?: number
  /** Per-option disabled (e.g. count=0); ChipGroup blocks toggling. */
  disabled?: boolean
}

// TFnData is the raw API row shape, mapped to FilterOption[] via `select`.
// QueryKey is `any` to sidestep contravariance with narrow tuple keys.
export type AsyncSearchQueryFactory<TInput, TFnData = FilterOption[]> = (
  input: TInput
  // biome-ignore lint/suspicious/noExplicitAny: see comment above
) => UseQueryOptions<TFnData, Error, FilterOption[], any>

export type FilterFieldConfig<T extends string> = {
  key: T
  label: string
  placeholder: string
  // Required for static variants; async variant uses the loader callbacks instead.
  // Kept permissive to avoid a discriminated-union explosion in FilterAccordion.
  options: FilterOption[]
  variant?: 'chips' | 'search-select' | 'async-search-select'
  // Async variant only. TFnData open so adapters mapping raw rows via `select` assign.
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
