/** @vitest-environment jsdom */

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAddPurchase } from '../../../lib/queries/purchases'
import { useUpdateUserProduct } from '../../../lib/queries/user-products'
import { mockUseQueryByKey, renderWithProviders } from '../../../test/utils'
import { CollectionPage } from '../page/CollectionPage'
import { makeUserProductMock, mockPrefs } from './__fixtures__'

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    Link: vi.fn(({ children }) => <a href="/">{children}</a>),
    getRouteApi: () => ({
      useNavigate: () => vi.fn(),
      useSearch: () => ({
        q: '',
        sort: 'name',
        brand: 'all',
        productType: 'all',
        sentiment: 'all',
        repurchase: 'all',
        minNote: 0,
        maxPrice: '',
      }),
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
  makeUserProductMock({
    id: 'up-1',
    status: 'wishlist', // Start in wishlist
    qty: 0,
    productId: 'p-1',
    product: { name: 'Dream Cream', brand: 'Cloud Nine', kind: 'Cream', priceCents: 2500 },
  }),
]

vi.mock('../../../lib/queries/user-products', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    useUpdateUserProduct: vi.fn(),
    useDeleteUserProduct: () => ({ mutate: vi.fn() }),
    useUpsertUserProductReview: () => ({ mutate: vi.fn() }),
  }
})

vi.mock('../../../lib/queries/user-preferences', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
  }
})

vi.mock('../../../lib/queries/purchases', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    useAddPurchase: vi.fn(),
  }
})

vi.mock('../../../hooks/useScrollLock', () => ({
  useScrollLock: vi.fn(),
}))

describe("Flow : Enregistrement d'achat depuis la collection", () => {
  const mockUpdateProduct = vi.fn()
  const mockAddStock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseQueryByKey({
      'user-products': mockUserProducts,
      'user-preferences': mockPrefs,
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
    const productBtn = await screen.findByRole('button', {
      name: /Voir les détails de Dream Cream/i,
    })
    await userEvent.click(productBtn)

    // Click "Enregistrer un achat" in sheet (lazy component — findByRole waits for resolve)
    const addPurchaseBtn = await screen.findByRole('button', { name: /Enregistrer un achat/i })
    await userEvent.click(addPurchaseBtn)

    // Check if purchase form appears
    expect(screen.getByText('ENREGISTRER UN ACHAT')).toBeInTheDocument()
    expect(screen.getByLabelText(/Date d'achat/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Prix payé/i)).toBeInTheDocument()
  })

  it("appelle addStockEntry lors de la validation du formulaire d'achat", async () => {
    renderWithProviders(<CollectionPage />)

    await userEvent.click(
      await screen.findByRole('button', { name: /Voir les détails de Dream Cream/i })
    )
    await userEvent.click(await screen.findByRole('button', { name: /Enregistrer un achat/i }))

    const priceInput = screen.getByLabelText(/Prix payé/i)
    await userEvent.type(priceInput, '22.50')

    const saveBtn = screen.getByRole('button', { name: 'Valider' })
    await userEvent.click(saveBtn)

    expect(mockAddStock).toHaveBeenCalledWith(
      expect.objectContaining({
        userProductId: 'up-1',
        input: expect.objectContaining({
          pricePaidCents: 2250,
        }),
      }),
      expect.anything()
    )
  })

  it('ne déclenche plus le formulaire automatiquement lors du passage en stock', async () => {
    renderWithProviders(<CollectionPage />)

    await userEvent.click(
      await screen.findByRole('button', { name: /Voir les détails de Dream Cream/i })
    )

    const statusButtons = await screen.findAllByRole('button', { name: /En stock/i })
    const inStockBtn = statusButtons.find((btn) => btn.className.includes('pds-status-chip'))
    if (!inStockBtn) throw new Error('In Stock status button not found')
    await userEvent.click(inStockBtn)

    expect(mockUpdateProduct).toHaveBeenCalled()
    expect(screen.queryByText("ENREGISTRER L'ACHAT")).not.toBeInTheDocument()
  })
})
