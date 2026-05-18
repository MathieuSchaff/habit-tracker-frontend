import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { useAuthStore } from '@/store/auth'
import { ProductInfoTab } from '../ProductInfoTab'

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useQuery: vi.fn(), useSuspenseQuery: vi.fn() }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    Link: vi.fn(({ children }) => children),
    getRouteApi: vi.fn(() => ({ useParams: () => ({ slug: 'product-x' }) })),
  }
})

vi.mock('@/lib/queries/products', () => ({
  productQueries: { bySlug: vi.fn(() => ({ queryKey: ['p', 'bySlug'] })) },
}))

vi.mock('@/lib/queries/profile', () => ({
  profileQueries: { dermo: vi.fn(() => ({ queryKey: ['profile', 'dermo'] })) },
}))

vi.mock('@/store/auth', () => ({ useAuthStore: vi.fn() }))

vi.mock('@/hooks/useCopyToClipboard', () => ({ useCopyToClipboard: vi.fn() }))

// react-markdown is lazily imported by ProductInfoTab — short-circuit it.
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => children,
}))

function setProduct(overrides: Record<string, unknown> = {}) {
  vi.mocked(useSuspenseQuery).mockReturnValue({
    data: {
      id: 'p1',
      slug: 'product-x',
      name: 'Product X',
      description: 'A nice description',
      inci: null,
      notes: null,
      url: null,
      ingredients: [],
      tags: [],
      ...overrides,
    },
  } as unknown as ReturnType<typeof useSuspenseQuery>)
}

function setDermo(profile: { skinTypes?: string[]; skinConcerns?: string[] } | null) {
  vi.mocked(useQuery).mockReturnValue({
    data: profile,
    isLoading: false,
  } as unknown as ReturnType<typeof useQuery>)
}

describe('ProductInfoTab', () => {
  const copy = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    setProduct()
    setDermo(null)
    vi.mocked(useAuthStore).mockReturnValue(null as never)
    vi.mocked(useCopyToClipboard).mockReturnValue({
      copied: false,
      copy,
    } as unknown as ReturnType<typeof useCopyToClipboard>)
  })

  it('renders description and ingredient list with concentration formatting', () => {
    setProduct({
      description: 'Glow serum.',
      ingredients: [
        {
          ingredientSlug: 'niacinamide',
          ingredientName: 'Niacinamide',
          ingredientCategory: 'actif',
          concentrationValue: '10',
          concentrationUnit: '%',
          concentrationPer: null,
          notes: null,
        },
      ],
    })
    render(<ProductInfoTab />)

    expect(screen.getByText('Glow serum.')).toBeInTheDocument()
    expect(screen.getByText('Niacinamide')).toBeInTheDocument()
    expect(screen.getByText('10 %')).toBeInTheDocument()
  })

  it('copies the ingredient list as comma-joined string with concentrations', () => {
    setProduct({
      ingredients: [
        {
          ingredientSlug: 'niacinamide',
          ingredientName: 'Niacinamide',
          concentrationValue: '10',
          concentrationUnit: '%',
          concentrationPer: null,
        },
        {
          ingredientSlug: 'glycerin',
          ingredientName: 'Glycerin',
          concentrationValue: null,
          concentrationUnit: null,
          concentrationPer: null,
        },
      ],
    })
    render(<ProductInfoTab />)

    fireEvent.click(screen.getByRole('button', { name: 'Copier la liste des ingrédients' }))

    expect(copy).toHaveBeenCalledWith('Niacinamide (10 %), Glycerin')
  })

  it('warns when an avoid tag matches the user dermo profile', () => {
    vi.mocked(useAuthStore).mockReturnValue({ id: 'u1' } as never)
    setDermo({ skinTypes: ['peau-sensible'], skinConcerns: [] })
    setProduct({
      tags: [
        { tagSlug: 'peau-sensible', relevance: 'avoid' },
        { tagSlug: 'anti-age', relevance: 'primary' },
      ],
    })
    render(<ProductInfoTab />)

    expect(screen.getByText(/Peut ne pas convenir à votre profil cutané/)).toBeInTheDocument()
    expect(screen.getByText(/Sensible/)).toBeInTheDocument()
  })

  it('does not warn for non-matching avoid tags', () => {
    vi.mocked(useAuthStore).mockReturnValue({ id: 'u1' } as never)
    setDermo({ skinTypes: ['peau-grasse'], skinConcerns: [] })
    setProduct({
      tags: [{ tagSlug: 'peau-sensible', relevance: 'avoid' }],
    })
    render(<ProductInfoTab />)

    expect(screen.queryByText(/Peut ne pas convenir/)).not.toBeInTheDocument()
  })
})
