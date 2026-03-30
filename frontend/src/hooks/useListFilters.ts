import { useNavigate } from '@tanstack/react-router'
import type { RoutePaths } from '@tanstack/router-core'
import { useMemo } from 'react'

import type { FilterValues } from '@/component/Filter/Filter'
import type { routeTree } from '@/routeTree.gen'

interface UseListFiltersProps<T extends string> {
  from: RoutePaths<typeof routeTree>
  filters: FilterValues<T>
  emptyFilters: FilterValues<T>
  filterKeys: T[]
}

export function useListFilters<T extends string>({
  from,
  filters,
  emptyFilters,
  filterKeys,
}: UseListFiltersProps<T>) {
  const navigate = useNavigate({ from })

  const filterCount = useMemo(() => {
    return filterKeys.reduce((acc, key) => acc + (filters[key]?.length ?? 0), 0)
  }, [filters, filterKeys])

  const activeTags = useMemo(() => {
    return filterKeys.flatMap((key) => (filters[key] ?? []).map((value) => ({ key, value })))
  }, [filters, filterKeys])

  const applyFilters = (newFilters: FilterValues<T>) => {
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, ...newFilters, page: 1 }) })
  }

  const resetFilters = () => {
    navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, ...emptyFilters, page: 1 }),
      replace: true,
    })
  }

  const goToPage = (newPage: number) => {
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, page: newPage }) })
  }

  const toggleSingleFilter = (key: T, value: string) => {
    const current = filters[key] ?? []
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]

    applyFilters({ ...filters, [key]: next })
  }

  return {
    filterCount,
    activeTags,
    applyFilters,
    resetFilters,
    goToPage,
    toggleSingleFilter,
  }
}
