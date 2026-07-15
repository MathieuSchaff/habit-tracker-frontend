import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useIngredientTagFilterGroups } from '@/hooks/useIngredientTagFilterGroups'
import { useListFilters } from '@/hooks/useListFilters'
import { useAuthStore } from '@/store/auth'
import { ingredientLabels } from '../../constants'
import { IngredientsPage } from './IngredientsPage'

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useQuery: vi.fn() }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    Link: vi.fn(({ children }) => children),
    createLink: vi.fn(() => vi.fn(({ children }) => children)),
    useNavigate: vi.fn(),
    getRouteApi: vi.fn(() => ({
      useSearch: () => ({ page: 1, type: 'skincare', profile_filter: false }),
    })),
  }
})

vi.mock('@/lib/queries/ingredients', () => ({
  ingredientQueries: {
    list: vi.fn(() => ({ queryKey: ['ingredients', 'list'] })),
    filterOptions: vi.fn(() => ({ queryKey: ['ingredients', 'filter-options'] })),
    searchInfinite: vi.fn(() => ({ queryKey: ['ingredients', 'search-infinite'] })),
  },
}))

vi.mock('@/lib/queries/profile', () => ({
  profileQueries: { dermo: vi.fn(() => ({ queryKey: ['profile', 'dermo'] })) },
}))

vi.mock('@/store/auth', () => ({ useAuthStore: vi.fn() }))

vi.mock('@/hooks/useListFilters', () => ({ useListFilters: vi.fn() }))
vi.mock('@/hooks/useIngredientTagFilterGroups', () => ({
  useIngredientTagFilterGroups: vi.fn(() => []),
}))

// SearchCombobox + FilterDrawer fetch on their own and don't matter to the
// behaviours under test — short-circuit them.
vi.mock('@/component/Search/SearchCombobox', () => ({
  SearchCombobox: () => null,
}))
vi.mock('@/component/Filter/FilterDrawer/FilterDrawer', () => ({
  FilterDrawer: () => null,
}))
vi.mock('@/component/Filter/ActiveFiltersBar/ActiveFiltersBar', () => ({
  ActiveFiltersBar: () => null,
}))

function setQueriesByKey(map: Record<string, unknown>) {
  vi.mocked(useQuery).mockImplementation((opts: { queryKey: ReadonlyArray<unknown> }) => {
    const key = (opts.queryKey as string[])[1] ?? ''
    return {
      data: map[key],
      isLoading: false,
      isPlaceholderData: false,
    } as unknown as ReturnType<typeof useQuery>
  })
}

function setListFilters(overrides: Partial<ReturnType<typeof useListFilters>> = {}) {
  vi.mocked(useListFilters).mockReturnValue({
    filterCount: 0,
    activeTags: [],
    applyFilters: vi.fn(),
    resetFilters: vi.fn(),
    goToPage: vi.fn(),
    toggleSingleFilter: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useListFilters>)
}

describe('IngredientsPage', () => {
  const navigate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    vi.mocked(useAuthStore).mockReturnValue(null as never)
    vi.mocked(useIngredientTagFilterGroups).mockReturnValue([])
    setListFilters()
    setQueriesByKey({
      list: { items: [], total: 0 },
      'filter-options': { tags: [] },
    })
  })

  it('renders the empty state when the query returns no items', () => {
    render(<IngredientsPage />)
    expect(screen.getByText(ingredientLabels.noResultsTitle)).toBeInTheDocument()
  })

  it('renders one card per ingredient returned by the query', () => {
    setQueriesByKey({
      list: {
        items: [
          {
            id: 'i1',
            slug: 'retinol',
            name: 'Rétinol',
            description: 'Anti-âge classique.',
            category: 'rétinoïde',
            profileMatches: [],
          },
          {
            id: 'i2',
            slug: 'niacinamide',
            name: 'Niacinamide',
            description: 'Régule le sébum.',
            category: 'actif',
            profileMatches: [],
          },
        ],
        total: 2,
      },
      'filter-options': { tags: [] },
    })

    render(<IngredientsPage />)
    expect(screen.getByText('Rétinol')).toBeInTheDocument()
    expect(screen.getByText('Niacinamide')).toBeInTheDocument()
    expect(screen.getByText('Régule le sébum.')).toBeInTheDocument()
  })

  it('flags ingredients matching the user profile with the avoid badge', () => {
    setQueriesByKey({
      list: {
        items: [
          {
            id: 'i1',
            slug: 'retinol',
            name: 'Rétinol',
            description: '',
            category: 'rétinoïde',
            profileMatches: ['peau-sensible'],
          },
        ],
        total: 1,
      },
      'filter-options': { tags: [] },
    })

    render(<IngredientsPage />)
    expect(screen.getByText(/Éviter/)).toBeInTheDocument()
  })

  it('fires navigate when a domain tab is clicked', () => {
    render(<IngredientsPage />)
    // Skincare is active by default; click haircare to trigger the change.
    fireEvent.click(screen.getByRole('tab', { name: /Cheveux/ }))
    expect(navigate).toHaveBeenCalledTimes(1)
  })
})
