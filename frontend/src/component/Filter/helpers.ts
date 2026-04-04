import { z } from 'zod'

import type { FilterGroupConfig, FilterValues } from './types'

export function emptyFilters<T extends string>(keys: readonly T[]): FilterValues<T> {
  const result = {} as FilterValues<T>
  for (const key of keys) {
    result[key] = []
  }
  return result
}

export function filterSearchSchema<T extends string>(keys: readonly T[]) {
  const shape = {} as { [K in T]: z.ZodDefault<z.ZodArray<z.ZodString>> }
  const defaults = {} as { [K in T]: string[] } & { page: number }

  for (const key of keys) {
    shape[key] = z.string().array().default([])
    ;(defaults as Record<string, string[] | number>)[key] = [] as string[]
  }

  const schema = z.object({
    ...shape,
    page: z.number().min(1).default(1),
  })

  defaults.page = 1

  return { schema, defaultValues: defaults }
}

export function getFilterLabel<T extends string>(
  groups: FilterGroupConfig<T>[],
  key: T,
  value: string
): string {
  for (const group of groups) {
    for (const sf of group.subFilters) {
      if (sf.key === key) {
        return sf.options.find((o) => o.value === value)?.label ?? value
      }
    }
  }
  return value
}

export function filtersToQuery(
  filters: Record<string, string[] | string | number | undefined>
): Record<string, string> {
  const query: Record<string, string> = {}
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      if (value.length > 0) query[key] = value.join(',')
    } else {
      query[key] = String(value)
    }
  }
  return query
}
