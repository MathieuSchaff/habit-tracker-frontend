import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ingredientLabels } from '../../constants'
import { IngredientInfoTab } from './IngredientInfoTab'

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useQuery: vi.fn(), useSuspenseQuery: vi.fn() }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    Link: vi.fn(({ children }) => children),
    // Returns a frozen object resolved at module load — beforeEach is too late
    // because IngredientInfoTab calls getRouteApi() at the top level.
    getRouteApi: vi.fn(() => ({ useParams: () => ({ slug: 'retinol' }) })),
  }
})

vi.mock('@/lib/queries/ingredients', () => ({
  ingredientQueries: {
    bySlug: vi.fn(() => ({ queryKey: ['i', 'bySlug'] })),
    products: vi.fn(() => ({ queryKey: ['i', 'products'] })),
    tags: vi.fn(() => ({ queryKey: ['i', 'tags'] })),
  },
}))

// react-markdown + plugins are ESM-only — stub to avoid module-graph cost.
vi.mock('react-markdown', () => ({ default: ({ children }: { children: string }) => children }))
vi.mock('remark-gfm', () => ({ default: () => null }))

function setIngredient(overrides: Record<string, unknown> = {}) {
  vi.mocked(useSuspenseQuery).mockReturnValue({
    data: {
      id: 'i1',
      slug: 'retinol',
      name: 'Rétinol',
      type: 'actif',
      category: 'rétinoïde',
      description: 'Description',
      content: '',
      updatedAt: '2026-01-15T10:00:00Z',
      ...overrides,
    },
  } as unknown as ReturnType<typeof useSuspenseQuery>)
}

function setQueryData(map: Record<string, unknown>) {
  vi.mocked(useQuery).mockImplementation(
    (opts: { queryKey: ReadonlyArray<unknown> }) =>
      ({
        data: map[(opts.queryKey[1] as string) ?? ''],
        isLoading: false,
      }) as unknown as ReturnType<typeof useQuery>
  )
}

describe('IngredientInfoTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // getRouteApi factory already returns { useParams } — re-apply after clear.
    vi.mocked(getRouteApi).mockReturnValue({
      useParams: () => ({ slug: 'retinol' }),
    } as unknown as ReturnType<typeof getRouteApi>)
    setIngredient()
    setQueryData({ products: [], tags: [] })
  })

  it('renders family (type + category) and the description section', () => {
    render(<IngredientInfoTab />)

    expect(screen.getByText('actif')).toBeInTheDocument()
    expect(screen.getByText('rétinoïde')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
  })

  it('splits tags into beneficial (Fonctions) and avoid (À noter) sections', () => {
    setQueryData({
      products: [],
      tags: [
        { ingredientTagId: 't1', tagName: 'Anti-âge', relevance: 'primary' },
        { ingredientTagId: 't2', tagName: 'Photosensibilisant', relevance: 'avoid' },
      ],
    })
    render(<IngredientInfoTab />)

    expect(screen.getByText('Anti-âge')).toBeInTheDocument()
    expect(screen.getByText('Photosensibilisant')).toBeInTheDocument()
  })

  it('shows an empty-state message when no products reference the ingredient', () => {
    setQueryData({ products: [], tags: [] })
    render(<IngredientInfoTab />)
    expect(screen.getByText(ingredientLabels.noProductsAssociated)).toBeInTheDocument()
  })

  it('truncates to MAX_VISIBLE_PRODUCTS and exposes a "Voir tous" link', () => {
    const products = Array.from({ length: 8 }, (_, i) => ({
      id: `p${i}`,
      slug: `product-${i}`,
      name: `Produit ${i}`,
    }))
    setQueryData({ products, tags: [] })
    render(<IngredientInfoTab />)

    // 5 visible names + the "Voir tous" link.
    expect(screen.getByText('Produit 0')).toBeInTheDocument()
    expect(screen.getByText('Produit 4')).toBeInTheDocument()
    expect(screen.queryByText('Produit 5')).not.toBeInTheDocument()
    expect(screen.getByText('Voir tous les produits (8)')).toBeInTheDocument()
  })
})
