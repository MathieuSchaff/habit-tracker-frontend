// Barrel re-export — consumers import from '@/component/Filter'
// and get the types + components without knowing the internal split.

export { ActiveFiltersBar } from './ActiveFiltersBar/ActiveFiltersBar'
export { FilterDrawer } from './FilterDrawer/FilterDrawer'
export { emptyFilters, filterSearchSchema, filtersToQuery, getFilterLabel } from './helpers'
export type {
  FilterFieldConfig,
  FilterGroupConfig,
  FilterOption,
  FilterSubGroup,
  FilterValues,
  GroupedFilterField,
} from './types'
