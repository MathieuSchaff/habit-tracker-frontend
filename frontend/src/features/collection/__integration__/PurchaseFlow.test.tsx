/** @vitest-environment jsdom */

import { useQuery } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAddPurchase } from '../../../lib/queries/purchases'
import { useUpdateUserProduct } from '../../../lib/queries/user-products'
import { renderWithProviders } from '../../../test/utils'
import { CollectionPage } from '../page/CollectionPage'

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
    status: 'wishlist', // Start in wishlist
    qty: 0,
    sentiment: null,
    wouldRepurchase: null,
    updatedAt: new Date().toISOString(),
    productId: 'p-1',
    product: { name: 'Dream Cream', brand: 'Cloud Nine', kind: 'Cream', priceCents: 2500 },
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
  useDeleteUserProduct: () => ({ mutate: vi.fn() }),
  useUpsertUserProductReview: () => ({ mutate: vi.fn() }),
}))

vi.mock('../../../lib/queries/user-preferences', () => ({
  userPreferenceQueries: {
    get: () => ({ queryKey: ['user-preferences'] }),
  },
}))

vi.mock('../../../lib/queries/purchases', () => ({
  purchaseQueries: {
    byUserProduct: (id: string) => ({ queryKey: ['purchases', id] }),
  },
  useAddPurchase: vi.fn(),
}))

vi.mock('../../../hooks/useScrollLock', () => ({
  useScrollLock: vi.fn(),
}))

describe("Flow : Enregistrement d'achat depuis la collection", () => {
  const mockUpdateProduct = vi.fn()
  const mockAddStock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useQuery).mockImplementation((options: any) => {
      const key = options.queryKey?.[0]
      if (key === 'user-products') {
        return { data: mockUserProducts, isLoading: false } as any
      }
      if (key === 'user-preferences') {
        return { data: mockPrefs, isLoading: false } as any
      }
      return { data: undefined, isLoading: false } as any
    })

    vi.mocked(useUpdateUserProduct).mockReturnValue({
      mutate: mockUpdateProduct,
      isPending: false,
    } as any)

    vi.mocked(useAddPurchase).mockReturnValue({
      mutate: mockAddStock,
      isPending: false,
    } as any)
  })

  it("affiche le formulaire d'achat lors du clic sur le bouton dédié", async () => {
    renderWithProviders(<CollectionPage />)

    // Expand product
    const productBtn = await screen.findByRole('button', { name: /Dream Cream/i })
    await userEvent.click(productBtn)

    // Click "Nouvel achat" in footer
    const addPurchaseBtn = screen.getByRole('button', { name: /Nouvel achat/i })
    await userEvent.click(addPurchaseBtn)

    // Check if purchase form appears
    expect(screen.getByText("ENREGISTRER L'ACHAT")).toBeInTheDocument()
    expect(screen.getByLabelText(/Date d'achat/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Prix payé/i)).toBeInTheDocument()
  })

  it("appelle addStockEntry lors de la validation du formulaire d'achat", async () => {
    renderWithProviders(<CollectionPage />)

    await userEvent.click(await screen.findByRole('button', { name: /Dream Cream/i }))
    await userEvent.click(screen.getByRole('button', { name: /Nouvel achat/i }))

    const priceInput = screen.getByLabelText(/Prix payé/i)
    await userEvent.type(priceInput, '22.50')

    const saveBtn = screen.getByRole('button', { name: 'Enregistrer' })
    await userEvent.click(saveBtn)

    expect(mockAddStock).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'p-1',
        qty: 1,
        pricePaidCents: 2250,
      }),
      expect.any(Object)
    )
  })

  it('ne déclenche plus le formulaire automatiquement lors du passage en stock', async () => {
    renderWithProviders(<CollectionPage />)

    await userEvent.click(await screen.findByRole('button', { name: /Dream Cream/i }))

    const statusButtons = screen.getAllByRole('button', { name: /En stock/i })
    const inStockBtn = statusButtons.find((btn) => btn.className.includes('coll-status-option'))
    if (!inStockBtn) throw new Error('In Stock status button not found')
    await userEvent.click(inStockBtn)

    expect(mockUpdateProduct).toHaveBeenCalled()
    expect(screen.queryByText("ENREGISTRER L'ACHAT")).not.toBeInTheDocument()
  })
})
