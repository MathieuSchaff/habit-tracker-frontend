import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useProductTagFilterGroups } from '../useProductTagFilterGroups'

describe('useProductTagFilterGroups', () => {
  it('renders every haircare accordion category from shared, even when tagCounts is empty', () => {
    const { result } = renderHook(() => useProductTagFilterGroups('haircare', {}))
    const ids = result.current.map((g) => g.id)
    expect(ids).toEqual([
      'hair_type',
      'concern',
      'product_type',
      'routine_step',
      'hair_effect',
      'product_label',
    ])
    for (const group of result.current) {
      expect(group.subFilters[0]?.options.length).toBeGreaterThan(0)
    }
  })

  it('disables chips whose slug has no matching products (count=0)', () => {
    const { result } = renderHook(() =>
      useProductTagFilterGroups('haircare', { 'cheveux-secs': 3 })
    )
    const concern = result.current.find((g) => g.id === 'concern')
    const opts = concern?.subFilters[0]?.options ?? []
    const seeded = opts.find((o) => o.value === 'cheveux-secs')
    const empty = opts.find((o) => o.value === 'pellicules')
    expect(seeded?.count).toBe(3)
    expect(seeded?.disabled).toBe(false)
    expect(empty?.count).toBe(0)
    expect(empty?.disabled).toBe(true)
  })

  it('applies labelOverrides on top of shared labels', () => {
    const { result } = renderHook(() =>
      useProductTagFilterGroups('skincare', {}, { 'barriere-cutanee': 'Peau sensibilisée' })
    )
    const concern = result.current.find((g) => g.id === 'concern')
    const overridden = concern?.subFilters[0]?.options.find((o) => o.value === 'barriere-cutanee')
    expect(overridden?.label).toBe('Peau sensibilisée')
  })

  it('sorts options alphabetically by label (FR locale)', () => {
    const { result } = renderHook(() => useProductTagFilterGroups('dental', {}))
    const concern = result.current.find((g) => g.id === 'concern')
    const labels = concern?.subFilters[0]?.options.map((o) => o.label) ?? []
    const sorted = [...labels].sort((a, b) => a.localeCompare(b, 'fr'))
    expect(labels).toEqual(sorted)
  })

  it('builds groups for all four product domains', () => {
    for (const domain of ['skincare', 'haircare', 'dental', 'complement'] as const) {
      const { result } = renderHook(() => useProductTagFilterGroups(domain, {}))
      expect(result.current.length).toBeGreaterThan(0)
    }
  })
})
