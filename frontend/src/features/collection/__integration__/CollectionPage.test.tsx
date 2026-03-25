/** @vitest-environment jsdom */

import { useQuery } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
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

vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({
    useNavigate: () => (updates: any) => {
      if (typeof updates.search === 'function') {
        mockSearch = updates.search(mockSearch)
      } else {
        mockSearch = { ...mockSearch, ...updates.search }
      }
      // console.log('Mock search updated:', mockSearch)
    },
    useSearch: () => mockSearch,
  }),
}))

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

vi.mock('../../../lib/queries/user-products', () => ({
  userProductQueries: {
    list: () => ({ queryKey: ['user-products'] }),
  },
  useUpdateUserProduct: vi.fn(),
  useDeleteUserProduct: vi.fn(),
  useUpsertUserProductReview: vi.fn(),
}))

vi.mock('../../../lib/queries/user-preferences', () => ({
  userPreferenceQueries: {
    get: () => ({ queryKey: ['user-preferences'] }),
  },
}))

vi.mock('../../../lib/queries/stock', () => ({
  stockQueries: {
    entries: () => ({ queryKey: ['stock-entries'] }),
  },
  useAddStockEntry: () => ({ mutate: vi.fn() }),
}))

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

  it('products are grouped by status in shelf sections', async () => {
    renderWithProviders(<CollectionPage />)

    // Both products visible in their respective sections
    expect(await screen.findByText('Super Serum')).toBeInTheDocument()
    expect(screen.getByText('Cool Cream')).toBeInTheDocument()

    // Section headers show status labels
    expect(screen.getByText('En stock')).toBeInTheDocument()
    expect(screen.getByText('Wishlist')).toBeInTheDocument()
  })

  it('recherche un produit par son nom', async () => {
    const { rerender } = renderWithProviders(<CollectionPage />)

    const searchInput = await screen.findByPlaceholderText(/Rechercher/i)
    await userEvent.type(searchInput, 'Super')
    rerender(<CollectionPage />)

    expect(screen.getByText('Super Serum')).toBeInTheDocument()
    expect(screen.queryByText('Cool Cream')).not.toBeInTheDocument()
  })

  it("met à jour le ressenti et les critères d'évaluation", async () => {
    renderWithProviders(<CollectionPage />)

    // Click on ShelfProductCard to expand the product
    const shelfCard = (await screen.findByText('Super Serum')).closest('.shelf-card')!
    await userEvent.click(shelfCard)

    // Change sentiment to "😍" — find within the expanded card details
    const sentimentBtns = screen.getAllByText('😍')
    // The one inside the sentiment selector (not the shelf card)
    const sentimentBtn = sentimentBtns.find((el) => el.closest('.coll-sentiment-option'))!
    await userEvent.click(sentimentBtn)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'up-1',
        input: { sentiment: 5 },
      }),
      expect.any(Object)
    )

    // Rate a criterion (Stars)
    const starButtons = screen
      .getAllByRole('button')
      .filter((b) => b.querySelector('.coll-star-icon'))
    // Click any star
    await userEvent.click(starButtons[0])
    expect(mockReview).toHaveBeenCalledWith(expect.any(Object), expect.any(Object))
  })

  it('permet de retirer un produit après confirmation', async () => {
    renderWithProviders(<CollectionPage />)

    // Click on ShelfProductCard to expand
    const shelfCard = (await screen.findByText('Super Serum')).closest('.shelf-card')!
    await userEvent.click(shelfCard)

    const deleteBtn = screen.getByRole('button', { name: /Retirer/i })
    await userEvent.click(deleteBtn)

    // Click "Retirer" in the confirm dialog
    const confirmBtns = screen.getAllByRole('button', { name: /Retirer/i })
    const dialogConfirm = confirmBtns.find((btn) =>
      btn.className.includes('coll-delete-dialog-confirm')
    )!
    await userEvent.click(dialogConfirm)

    expect(mockDelete).toHaveBeenCalledWith('up-1')
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
