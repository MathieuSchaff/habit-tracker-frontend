import { describe, expect, it } from 'vitest'

import {
  emptyFilters,
  filterSearchSchema,
  filtersToQuery,
  getFilterLabel,
} from './helpers'
import type { FilterGroupConfig } from './types'

type Key = 'concern' | 'kind' | 'ingredient'

describe('emptyFilters', () => {
  it('returns an object with one empty array per key', () => {
    const result = emptyFilters(['concern', 'kind'] as const)
    expect(result).toEqual({ concern: [], kind: [] })
  })

  it('returns {} for an empty key list', () => {
    expect(emptyFilters([] as const)).toEqual({})
  })

  it('produces a fresh array for each key (no shared reference)', () => {
    const result = emptyFilters(['concern', 'kind'] as const)
    result.concern.push('acne')
    expect(result.kind).toEqual([])
  })
})

describe('filterSearchSchema', () => {
  it('parses absent fields as empty arrays and page=1 by default', () => {
    const { schema } = filterSearchSchema(['concern', 'kind'] as const)
    const parsed = schema.parse({})
    expect(parsed).toEqual({ concern: [], kind: [], page: 1 })
  })

  it('keeps explicit array values intact', () => {
    const { schema } = filterSearchSchema(['concern'] as const)
    const parsed = schema.parse({ concern: ['acne', 'aging'] })
    expect(parsed.concern).toEqual(['acne', 'aging'])
  })

  it('rejects non-string entries inside arrays', () => {
    const { schema } = filterSearchSchema(['concern'] as const)
    expect(() => schema.parse({ concern: [42] })).toThrow()
  })

  it('rejects page < 1', () => {
    const { schema } = filterSearchSchema(['concern'] as const)
    expect(() => schema.parse({ page: 0 })).toThrow()
  })

  it('returns defaultValues mirroring keys + page=1', () => {
    const { defaultValues } = filterSearchSchema(['concern', 'kind'] as const)
    expect(defaultValues).toEqual({ concern: [], kind: [], page: 1 })
  })
})

describe('getFilterLabel', () => {
  const GROUPS: FilterGroupConfig<Key>[] = [
    {
      id: 'g1',
      label: 'Problème',
      defaultOpen: true,
      tier: 'essential',
      subFilters: [
        {
          key: 'concern',
          label: 'Problème',
          placeholder: '',
          options: [
            { value: 'acne', label: 'Acné' },
            { value: 'aging', label: 'Vieillissement' },
          ],
        },
      ],
    },
    {
      id: 'g2',
      label: 'Type',
      defaultOpen: false,
      tier: 'advanced',
      subFilters: [
        {
          key: 'kind',
          label: 'Type',
          placeholder: '',
          options: [{ value: 'serum', label: 'Sérum' }],
        },
      ],
    },
  ]

  it('returns the matching option label for a known (key, value)', () => {
    expect(getFilterLabel(GROUPS, 'concern', 'acne')).toBe('Acné')
    expect(getFilterLabel(GROUPS, 'kind', 'serum')).toBe('Sérum')
  })

  it('falls back to the raw value when the value is unknown for a known key', () => {
    expect(getFilterLabel(GROUPS, 'concern', 'mystery')).toBe('mystery')
  })

  it('falls back to the raw value when the key is absent from all groups', () => {
    expect(getFilterLabel(GROUPS, 'ingredient' as Key, 'retinol')).toBe('retinol')
  })

  it('returns the raw value when groups is empty', () => {
    expect(getFilterLabel<Key>([], 'concern', 'acne')).toBe('acne')
  })
})

describe('filtersToQuery', () => {
  it('joins arrays with commas and skips empty arrays', () => {
    const result = filtersToQuery({
      concern: ['acne', 'aging'],
      kind: [],
      brand: ['cerave'],
    })
    expect(result).toEqual({ concern: 'acne,aging', brand: 'cerave' })
  })

  it('stringifies scalar values', () => {
    expect(filtersToQuery({ page: 3, sort: 'price_asc' })).toEqual({
      page: '3',
      sort: 'price_asc',
    })
  })

  it('skips undefined entries entirely', () => {
    expect(filtersToQuery({ q: undefined, page: 1 })).toEqual({ page: '1' })
  })

  it('preserves empty string scalar (only undefined and empty arrays are dropped)', () => {
    expect(filtersToQuery({ q: '' })).toEqual({ q: '' })
  })

  it('returns {} for an entirely empty input', () => {
    expect(filtersToQuery({})).toEqual({})
  })
})
