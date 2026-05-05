/** @vitest-environment jsdom */

import { useQuery } from '@tanstack/react-query'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useDeleteUserProduct,
  useUpdateUserProduct,
  useUpsertUserProductReview,
} from '../../../lib/queries/user-products'
import { renderWithProviders } from '../../../test/utils'
import { CollectionPage } from '../page/CollectionPage'

let mockSearch = {
  q: '',
  sort: 'name',
  brand: 'all',
  kind: 'all',
  sentiment: 'all',
  repurchase: 'all',
  minNote: 0,
  maxPrice: '',
}

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    Link: vi.fn(({ children }) => <a href="/">{children}</a>),
    getRouteApi: () => ({
      useNavigate: () => (updates: any) => {
        if (typeof updates.search === 'function') {
          mockSearch = updates.search(mockSearch)
        } else {
          mockSearch = { ...mockSearch, ...updates.search }
        }
      },
      useSearch: () => mockSearch,
    }),
  }
})

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    useQuery: vi.fn(),
  }
})

const mockUserProducts = [
  {
    id: 'up-1',
    status: 'in_stock',
    qty: 1,
    sentiment: 5,
    wouldRepurchase: 'yes',
    updatedAt: new Date().toISOString(),
    product: { name: 'Super Serum', brand: 'Nice Brand', kind: 'Serum', priceCents: 2000 },
    review: { tolerance: 5, efficacy: 5 },
  },
  {
    id: 'up-2',
    status: 'wishlist',
    qty: 0,
    sentiment: null,
    wouldRepurchase: null,
    updatedAt: new Date().toISOString(),
    product: { name: 'Cool Cream', brand: 'Other Brand', kind: 'Cream', priceCents: 1500 },
    review: null,
  },
]

const mockPrefs = {
  displayScale: 'out_of_20',
  criteriaWeights: { tolerance: 1, efficacy: 1 },
}

vi.mock('../../../lib/queries/user-products', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    useUpdateUserProduct: vi.fn(),
    useDeleteUserProduct: vi.fn(),
    useUpsertUserProductReview: vi.fn(),
  }
})

vi.mock('../../../lib/queries/user-preferences', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
  }
})

vi.mock('../../../lib/queries/stock', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    useAddStockEntry: () => ({ mutate: vi.fn() }),
  }
})

vi.mock('../../../hooks/useScrollLock', () => ({
  useScrollLock: vi.fn(),
}))

describe('CollectionPage', () => {
  const mockUpdate = vi.fn()
  const mockDelete = vi.fn()
  const mockReview = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockSearch = {
      q: '',
      sort: 'name',
      brand: 'all',
      kind: 'all',
      sentiment: 'all',
      repurchase: 'all',
      minNote: 0,
      maxPrice: '',
    }

    vi.mocked(useQuery).mockImplementation((options: any) => {
      const key = options.queryKey?.[0]
      if (key === 'user-products') {
        return { data: mockUserProducts, isLoading: false } as any
      }
      if (key === 'user-preferences') {
        return { data: mockPrefs, isLoading: false } as any
      }
      if (key === 'stock-entries') {
        return { data: [], isLoading: false } as any
      }
      return { data: undefined, isLoading: false } as any
    })

    vi.mocked(useUpdateUserProduct).mockReturnValue({ mutate: mockUpdate, isPending: false } as any)
    vi.mocked(useDeleteUserProduct).mockReturnValue({ mutate: mockDelete, isPending: false } as any)
    vi.mocked(useUpsertUserProductReview).mockReturnValue({
      mutate: mockReview,
      isPending: false,
    } as any)
  })

  it('affiche la liste des produits par défaut', async () => {
    renderWithProviders(<CollectionPage />)

    expect(await screen.findByText('Super Serum')).toBeInTheDocument()
    expect(screen.getByText('Cool Cream')).toBeInTheDocument()
  })

  it('cycle à travers les options de tri', async () => {
    const { rerender } = renderWithProviders(<CollectionPage />)

    const sortBtn = await screen.findByTitle(/Tri :/i)

    // Click to cycle (name -> note)
    await userEvent.click(sortBtn)
    rerender(<CollectionPage />)
    expect(screen.getByTitle(/Tri : Note/i)).toBeInTheDocument()
  })

  it('permet de changer d\'onglet vers "Achats"', async () => {
    renderWithProviders(<CollectionPage />)

    const historyTab = screen.getByRole('tab', { name: /Achats/i })
    await userEvent.click(historyTab)

    expect(screen.getByText(/Aucun achat enregistré/i)).toBeInTheDocument()
  })

  it('renders shelf tabs with status labels and shows all products on "Tout"', async () => {
    renderWithProviders(<CollectionPage />)

    // Both products visible on the default "Tout" tab
    expect(await screen.findByText('Super Serum')).toBeInTheDocument()
    expect(screen.getByText('Cool Cream')).toBeInTheDocument()

    // Shelf tabs expose status labels
    expect(screen.getByRole('tab', { name: /En stock/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Wishlist/i })).toBeInTheDocument()
  })

  it('recherche un produit par son nom', async () => {
    const { rerender } = renderWithProviders(<CollectionPage />)

    const searchInput = await screen.findByPlaceholderText(/Rechercher/i)
    // fireEvent.change is sometimes more reliable with mocked router search params
    fireEvent.change(searchInput, { target: { value: 'Super' } })

    rerender(<CollectionPage />)

    await waitFor(() => {
      expect(screen.getByText('Super Serum')).toBeInTheDocument()
      expect(screen.queryByText('Cool Cream')).not.toBeInTheDocument()
    })
  })

  it("met à jour le ressenti et les critères d'évaluation", async () => {
    renderWithProviders(<CollectionPage />)

    await screen.findByText('Super Serum')
    const cardBody = screen.getByRole('button', {
      name: /Voir les détails de Super Serum/i,
    })
    await userEvent.click(cardBody)

    // PDS opens — sentiment 5 button (😍, value === current 5 still triggers onChange(5))
    const sentimentBtn = await screen.findByRole('button', { name: /Ressenti 5 sur 5/i })
    await userEvent.click(sentimentBtn)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'up-1',
        input: { sentiment: 5 },
      })
    )

    const starButtons = screen.getAllByLabelText(/Noter .+ \d sur 5/)
    await userEvent.click(starButtons[0])
    expect(mockReview).toHaveBeenCalledWith(expect.any(Object))
  })

  it('permet de retirer un produit après confirmation', async () => {
    renderWithProviders(<CollectionPage />)

    await screen.findByText('Super Serum')
    const cardBody = screen.getByRole('button', {
      name: /Voir les détails de Super Serum/i,
    })
    await userEvent.click(cardBody)

    const deleteBtn = await screen.findByRole('button', {
      name: /Retirer Super Serum de ma collection/i,
    })
    await userEvent.click(deleteBtn)

    const dialog = await screen.findByRole('alertdialog')
    const confirmBtn = await within(dialog).findByRole('button', { name: /^Retirer$/ })
    await userEvent.click(confirmBtn)

    expect(mockDelete).toHaveBeenCalledWith('up-1', expect.anything())
  })

  it('ouvre le panneau de filtres avancés et filtre par marque', async () => {
    const { rerender } = renderWithProviders(<CollectionPage />)

    const filterToggle = await screen.findByTitle(/Filtres avancés/i)
    await userEvent.click(filterToggle)

    const brandSelect = screen.getByLabelText(/Marque/i)
    await userEvent.selectOptions(brandSelect, 'Nice Brand')

    const applyBtn = screen.getByRole('button', { name: /Appliquer les filtres/i })
    await userEvent.click(applyBtn)
    rerender(<CollectionPage />)

    expect(screen.getByText('Super Serum')).toBeInTheDocument()
    expect(screen.queryByText('Cool Cream')).not.toBeInTheDocument()
  })
})
