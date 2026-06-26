import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react'
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
  productKeys: { all: ['products'] as const },
  productQueries: {
    bySlug: vi.fn(() => ({ queryKey: ['p', 'bySlug'] })),
    publicReviews: vi.fn(() => ({
      queryKey: ['p', 'publicReviews'],
      queryFn: async () => ({ reviews: [] }),
    })),
  },
}))

const EMPTY_PUBLIC_REVIEWS = { reviews: [] }

vi.mock('@/lib/queries/profile', () => ({
  profileQueries: { dermo: vi.fn(() => ({ queryKey: ['profile', 'dermo'] })) },
}))

vi.mock('@/store/auth', () => ({ useAuthStore: vi.fn() }))

vi.mock('@/hooks/useCopyToClipboard', () => ({ useCopyToClipboard: vi.fn() }))

// react-markdown is lazily imported by ProductInfoTab — short-circuit it.
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => children,
}))

// ReportContentButton uses useCreateReport (useMutation) → needs a QueryClient;
// this suite renders bare. Not under test here.
vi.mock('@/features/discussions/components/ReportContentButton', () => ({
  ReportContentButton: () => null,
}))

// SuggestEditButton uses useProposeSuggestedEdit (useMutation) → needs a QueryClient;
// this suite renders bare. Not under test here.
vi.mock('@/features/discussions/components/SuggestEditButton', () => ({
  SuggestEditButton: () => null,
}))

// Posts surface + composer have their own suites and need a QueryClient (own
// useQuery / useMutation); this bare suite mocks them out like the buttons above.
vi.mock('@/features/products/components/ProductPostsSection/ProductPostsSection', () => ({
  ProductPostsSection: () => null,
}))
vi.mock('@/features/products/components/PostComposer/PostComposer', () => ({
  PostComposer: () => null,
}))

function setProduct(overrides: Record<string, unknown> = {}) {
  vi.mocked(useSuspenseQuery).mockReturnValue({
    data: {
      id: 'p1',
      slug: 'product-x',
      name: 'Product X',
      kind: 'moisturizer',
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
  // Two useQuery callers in ProductInfoTab now: dermo profile + publicReviews
  // (added with #7). Dispatch by queryKey so each gets the right payload.
  vi.mocked(useQuery).mockImplementation((options) => {
    const key = (options as { queryKey?: unknown[] }).queryKey
    if (Array.isArray(key) && key[1] === 'publicReviews') {
      return { data: EMPTY_PUBLIC_REVIEWS, isLoading: false } as unknown as ReturnType<
        typeof useQuery
      >
    }
    return { data: profile, isLoading: false } as unknown as ReturnType<typeof useQuery>
  })
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

  it('renders description and ingredient list with concentration formatting', async () => {
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
    await act(async () => {
      render(<ProductInfoTab />)
    })

    expect(screen.getByText('Glow serum.')).toBeInTheDocument()
    expect(screen.getByText('Niacinamide')).toBeInTheDocument()
    expect(screen.getByText('10 %')).toBeInTheDocument()
  })

  it('renders a neutral At a Glance summary from kind and ingredient groups', async () => {
    setProduct({
      kind: 'moisturizer',
      ingredients: [
        {
          ingredientSlug: 'niacinamide',
          ingredientName: 'Niacinamide',
          ingredientCategory: 'actif',
        },
        { ingredientSlug: 'glycerin', ingredientName: 'Glycerin', ingredientCategory: 'humectant' },
      ],
    })
    await act(async () => {
      render(<ProductInfoTab />)
    })

    expect(screen.getByText('En bref')).toBeInTheDocument()
    expect(screen.getByText(/Composition : actifs et agents hydratants\./)).toBeInTheDocument()
  })

  it('boxes the manufacturer copy behind a disclosure with an unverified-voice note', async () => {
    setProduct({ description: 'Buy now at a discount price!' })
    await act(async () => {
      render(<ProductInfoTab />)
    })

    expect(screen.getByText('Texte de la marque')).toBeInTheDocument()
    expect(screen.getByText('Voix commerciale, non vérifiée par Aurore.')).toBeInTheDocument()
    expect(screen.getByText('Buy now at a discount price!')).toBeInTheDocument()
  })

  it('copies the ingredient list as comma-joined string with concentrations', async () => {
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
    await act(async () => {
      render(<ProductInfoTab />)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Copier la liste des ingrédients' }))

    expect(copy).toHaveBeenCalledWith('Niacinamide (10 %), Glycerin')
  })

  it('warns when an avoid tag matches the user dermo profile', async () => {
    vi.mocked(useAuthStore).mockReturnValue({ id: 'u1' } as never)
    setDermo({ skinTypes: ['peau-sensible'], skinConcerns: [] })
    setProduct({
      tags: [
        { tagSlug: 'peau-sensible', relevance: 'avoid' },
        { tagSlug: 'anti-age', relevance: 'primary' },
      ],
    })
    await act(async () => {
      render(<ProductInfoTab />)
    })

    expect(screen.getByText(/Peut ne pas convenir à votre profil cutané/)).toBeInTheDocument()
    expect(screen.getByText(/Sensible/)).toBeInTheDocument()
  })

  it('does not warn for non-matching avoid tags', async () => {
    vi.mocked(useAuthStore).mockReturnValue({ id: 'u1' } as never)
    setDermo({ skinTypes: ['peau-grasse'], skinConcerns: [] })
    setProduct({
      tags: [{ tagSlug: 'peau-sensible', relevance: 'avoid' }],
    })
    await act(async () => {
      render(<ProductInfoTab />)
    })

    expect(screen.queryByText(/Peut ne pas convenir/)).not.toBeInTheDocument()
  })
})
