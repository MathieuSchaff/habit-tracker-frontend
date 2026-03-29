/** @vitest-environment jsdom */
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../../../test/utils'
import { QuickAdd } from '../components/modals/QuickAdd/QuickAdd'

vi.mock('../../../lib/queries/products', () => ({
  productQueries: {
    search: (q: string) => ({
      queryKey: ['products', 'search', q],
      queryFn: async () =>
        q.length >= 2
          ? [{ id: 'prod-1', name: 'CeraVe Cleanser', brand: 'CeraVe', slug: 'cerave-cleanser' }]
          : [],
    }),
    checkDuplicate: (name: string, brand: string) => ({
      queryKey: ['products', 'check-duplicate', name, brand],
      queryFn: async () => [],
    }),
    brands: () => ({
      queryKey: ['products', 'brands'],
      queryFn: async () => ['CeraVe', 'La Roche-Posay'],
    }),
  },
  useCreateProduct: vi.fn(),
}))

vi.mock('../../../lib/queries/user-products', () => ({
  useCreateUserProduct: vi.fn(),
}))

vi.mock('../../../lib/queries/purchases', () => ({
  useAddPurchase: vi.fn(),
}))

vi.mock('../../../hooks/useScrollLock', () => ({
  useScrollLock: vi.fn(),
}))

import { useCreateProduct } from '../../../lib/queries/products'
import { useAddPurchase } from '../../../lib/queries/purchases'
import { useCreateUserProduct } from '../../../lib/queries/user-products'

describe('Flow : ajout rapide dans Ma Collection', () => {
  const mockAddUserProduct = vi.fn().mockResolvedValue({ id: 'new-up-id' })
  const mockAddStockEntry = vi.fn().mockResolvedValue({})
  const mockCreateProduct = vi.fn().mockResolvedValue({
    id: 'new-prod',
    name: 'Mon Sérum',
    brand: 'Ma Marque',
    slug: 'mon-serum',
  })

  beforeEach(() => {
    vi.mocked(useCreateUserProduct).mockReturnValue({
      mutateAsync: mockAddUserProduct,
      isPending: false,
    } as any)
    vi.mocked(useAddPurchase).mockReturnValue({
      mutateAsync: mockAddStockEntry,
      isPending: false,
    } as any)
    vi.mocked(useCreateProduct).mockReturnValue({
      mutateAsync: mockCreateProduct,
      isPending: false,
    } as any)
    mockAddUserProduct.mockClear()
    mockAddStockEntry.mockClear()
    mockCreateProduct.mockClear()
  })

  it('le modal affiche les deux onglets', () => {
    renderWithProviders(<QuickAdd onClose={() => {}} />)
    expect(screen.getByText('Produit existant')).toBeInTheDocument()
    expect(screen.getByText('Nouveau produit')).toBeInTheDocument()
  })

  it('onglet "Produit existant" actif par défaut — affiche le SearchCombobox', () => {
    renderWithProviders(<QuickAdd onClose={() => {}} />)
    expect(screen.getByPlaceholderText('Rechercher dans le catalogue...')).toBeInTheDocument()
  })

  it('onglet "Nouveau produit" → affiche le formulaire de création', async () => {
    renderWithProviders(<QuickAdd onClose={() => {}} />)
    await userEvent.click(screen.getByText('Nouveau produit'))
    expect(screen.getByPlaceholderText('ex: CeraVe Hydrating Cleanser')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('ex: CeraVe')).toBeInTheDocument()
  })

  it("création d'un nouveau produit appelle createProduct puis addUserProduct", async () => {
    const onClose = vi.fn()
    renderWithProviders(<QuickAdd onClose={onClose} />)

    await userEvent.click(screen.getByText('Nouveau produit'))
    await userEvent.type(screen.getByPlaceholderText('ex: CeraVe Hydrating Cleanser'), 'Mon Sérum')
    await userEvent.type(screen.getByPlaceholderText('ex: CeraVe'), 'Ma Marque')
    // Lose focus to trigger the "Confirm brand" UI
    await userEvent.tab()

    // Click "Oui" to confirm the new brand
    const confirmButton = await screen.findByRole('button', { name: /Oui/ })
    await userEvent.click(confirmButton)

    await userEvent.click(screen.getByRole('button', { name: /Créer et ajouter/ }))

    await waitFor(() => {
      expect(mockCreateProduct).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Mon Sérum', brand: 'Ma Marque' })
      )
    })
    await waitFor(() => {
      expect(mockAddStockEntry).toHaveBeenCalled()
    })
  })

  it('le bouton fermer appelle onClose', async () => {
    const onClose = vi.fn()
    renderWithProviders(<QuickAdd onClose={onClose} />)
    await userEvent.click(screen.getByLabelText('Fermer'))
    expect(onClose).toHaveBeenCalled()
  })
})
