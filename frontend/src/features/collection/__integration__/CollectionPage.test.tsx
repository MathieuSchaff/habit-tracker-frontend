/** @vitest-environment jsdom */

import { useQuery } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react'
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

    const historyTab = screen.getByRole('button', { name: /Achats/i })
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

    // Click on ShelfProductCard to expand the product
    const shelfCard = (await screen.findByText('Super Serum')).closest('.prod-card')
    if (!shelfCard) throw new Error('Product card not found')
    await userEvent.click(shelfCard)

    // Change sentiment to "😍" — find within the expanded card details
    const sentimentBtns = screen.getAllByText('😍')
    // The one inside the sentiment selector
    const sentimentBtn = sentimentBtns.find((el) => el.closest('.pds-sentiment-btn'))
    if (!sentimentBtn) throw new Error('Sentiment button not found')
    await userEvent.click(sentimentBtn)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'up-1',
        input: { sentiment: 5 },
      })
    )

    // Rate a criterion (Stars)
    // In ProductDetailSheet, criteria use star buttons
    const starButtons = screen.getAllByLabelText(/Noter \d sur 5/)
    // Click any star
    await userEvent.click(starButtons[0])
    expect(mockReview).toHaveBeenCalledWith(expect.any(Object))
  })

  it('permet de retirer un produit après confirmation', async () => {
    renderWithProviders(<CollectionPage />)

    // Click on ShelfProductCard to expand
    const shelfCard = (await screen.findByText('Super Serum')).closest('.prod-card')
    if (!shelfCard) throw new Error('Product card not found')
    await userEvent.click(shelfCard)

    const deleteBtn = screen.getByRole('button', { name: /Retirer/i })
    await userEvent.click(deleteBtn)

    // Click "Retirer" in the confirm dialog
    const confirmBtns = screen.getAllByRole('button', { name: /Retirer/i })
    const dialogConfirm = confirmBtns.find((btn) => btn.className.includes('dcd-confirm'))
    if (!dialogConfirm) throw new Error('Delete confirmation button not found')
    await userEvent.click(dialogConfirm)

    expect(mockDelete).toHaveBeenCalledWith('up-1', expect.anything())
  })

  it('ouvre le panneau de filtres avancés et filtre par marque', async () => {
    const { rerender } = renderWithProviders(<CollectionPage />)

    const filterToggle = await screen.findByTitle(/Filtres avancés/i)
    await userEvent.click(filterToggle)

    const brandSelect = screen.getByLabelText(/Marque/i)
    await userEvent.selectOptions(brandSelect, 'Nice Brand')
    rerender(<CollectionPage />)

    const closeButtons = screen.getAllByLabelText(/Fermer les filtres/i)
    const closeBtn = closeButtons.find((btn) => btn.className.includes('coll-sheet-close'))
    if (closeBtn) await userEvent.click(closeBtn)

    expect(screen.getByText('Super Serum')).toBeInTheDocument()
    expect(screen.queryByText('Cool Cream')).not.toBeInTheDocument()
  })
})
