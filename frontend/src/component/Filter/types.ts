export type FilterOption = { value: string; label: string; count?: number }

export type FilterFieldConfig<T extends string> = {
  key: T
  label: string
  placeholder: string
  options: FilterOption[]
  variant?: 'chips' | 'search-select'
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
