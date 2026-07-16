import type { FilterValues } from '@/component/Filter'
import { FILTER_KEYS, type FilterKey } from '../filters'

export function emptyFilters(): FilterValues<FilterKey> {
  return Object.fromEntries(
    FILTER_KEYS.map((key) => [key, []])
  ) as unknown as FilterValues<FilterKey>
}
