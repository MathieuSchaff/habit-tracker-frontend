import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useListFilters } from '../useListFilters'

type TestFilter = 'brand' | 'category'

const navigateMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

const emptyFilters: Record<TestFilter, string[]> = { brand: [], category: [] }

function setup(filters: Record<TestFilter, string[]> = emptyFilters) {
  return renderHook(() =>
    useListFilters<TestFilter>({
      from: '/products/',
      filters,
      emptyFilters,
      filterKeys: ['brand', 'category'],
    })
  )
}

describe('useListFilters', () => {
  beforeEach(() => navigateMock.mockClear())

  // --- filterCount ---

  it('returns 0 when no filters are active', () => {
    const { result } = setup()
    expect(result.current.filterCount).toBe(0)
  })

  it('counts total active filter values across all keys', () => {
    const { result } = setup({ brand: ['CeraVe', 'La Roche-Posay'], category: ['serum'] })
    expect(result.current.filterCount).toBe(3)
  })

  // --- activeTags ---

  it('returns empty activeTags when no filters are active', () => {
    const { result } = setup()
    expect(result.current.activeTags).toEqual([])
  })

  it('returns flat activeTags with key/value pairs', () => {
    const { result } = setup({ brand: ['CeraVe'], category: ['serum', 'cream'] })
    expect(result.current.activeTags).toEqual([
      { key: 'brand', value: 'CeraVe' },
      { key: 'category', value: 'serum' },
      { key: 'category', value: 'cream' },
    ])
  })

  // --- applyFilters ---

  it('navigates with merged filters and resets page to 1', () => {
    const { result } = setup()

    act(() => result.current.applyFilters({ brand: ['Bioderma'], category: [] }))

    expect(navigateMock).toHaveBeenCalledWith({
      search: expect.any(Function),
    })

    const searchFn = navigateMock.mock.calls[0][0].search
    expect(searchFn({ page: 3, q: 'test' })).toEqual({
      page: 1,
      q: 'test',
      brand: ['Bioderma'],
      category: [],
    })
  })

  // --- resetFilters ---

  it('resets all filters to empty and sets page to 1 with replace', () => {
    const { result } = setup({ brand: ['CeraVe'], category: ['serum'] })

    act(() => result.current.resetFilters())

    expect(navigateMock).toHaveBeenCalledWith({
      search: expect.any(Function),
      replace: true,
    })

    const searchFn = navigateMock.mock.calls[0][0].search
    expect(searchFn({ page: 5, brand: ['CeraVe'], category: ['serum'] })).toEqual({
      page: 1,
      brand: [],
      category: [],
    })
  })

  // --- goToPage ---

  it('navigates to the given page number', () => {
    const { result } = setup()

    act(() => result.current.goToPage(4))

    const searchFn = navigateMock.mock.calls[0][0].search
    expect(searchFn({ page: 1, brand: ['x'] })).toEqual({ page: 4, brand: ['x'] })
  })

  // --- toggleSingleFilter ---

  it('adds a value when not present', () => {
    const { result } = setup({ brand: [], category: ['serum'] })

    act(() => result.current.toggleSingleFilter('brand', 'CeraVe'))

    const searchFn = navigateMock.mock.calls[0][0].search
    expect(searchFn({})).toEqual({
      page: 1,
      brand: ['CeraVe'],
      category: ['serum'],
    })
  })

  it('removes a value when already present', () => {
    const { result } = setup({ brand: ['CeraVe', 'Bioderma'], category: [] })

    act(() => result.current.toggleSingleFilter('brand', 'CeraVe'))

    const searchFn = navigateMock.mock.calls[0][0].search
    expect(searchFn({})).toEqual({
      page: 1,
      brand: ['Bioderma'],
      category: [],
    })
  })
})
