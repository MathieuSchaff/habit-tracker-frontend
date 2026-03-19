import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/utils'
import { QuickAddModal } from '../components/QuickAddModal/QuickAddModal'

vi.mock('../../../lib/queries/products', () => ({
  productQueries: {
    search: (q: string) => ({
      queryKey: ['products', 'search', q],
      queryFn: async () =>
        q.length >= 2
          ? [
              { id: 'prod-1', name: 'CeraVe Cleanser', brand: 'CeraVe', slug: 'cerave-cleanser' },
            ]
          : [],
    }),
  },
  useCreateProduct: vi.fn(),
}))

vi.mock('../../../lib/queries/user-products', () => ({
  useCreateUserProduct: vi.fn(),
}))

vi.mock('../../../hooks/useScrollLock', () => ({
  useScrollLock: vi.fn(),
}))

import { useCreateProduct } from '../../../lib/queries/products'
import { useCreateUserProduct } from '../../../lib/queries/user-products'

describe('Flow : ajout rapide dans Ma Collection', () => {
  const mockAddUserProduct = vi.fn().mockResolvedValue({})
  const mockCreateProduct = vi.fn().mockResolvedValue({
    id: 'new-prod',
    name: 'Mon Sérum',
    brand: 'Ma Marque',
    slug: 'mon-serum',
  })

  beforeEach(() => {
    vi.mocked(useCreateUserProduct).mockReturnValue({ mutateAsync: mockAddUserProduct, isPending: false } as any)
    vi.mocked(useCreateProduct).mockReturnValue({ mutateAsync: mockCreateProduct, isPending: false } as any)
    mockAddUserProduct.mockClear()
    mockCreateProduct.mockClear()
  })

  it('le modal affiche les deux onglets', () => {
    renderWithProviders(<QuickAddModal onClose={() => {}} />)
    expect(screen.getByText('Produit existant')).toBeInTheDocument()
    expect(screen.getByText('Nouveau produit')).toBeInTheDocument()
  })

  it('onglet "Produit existant" actif par défaut — affiche le SearchCombobox', () => {
    renderWithProviders(<QuickAddModal onClose={() => {}} />)
    expect(screen.getByPlaceholderText('Rechercher dans le catalogue...')).toBeInTheDocument()
  })

  it('onglet "Nouveau produit" → affiche le formulaire de création', async () => {
    renderWithProviders(<QuickAddModal onClose={() => {}} />)
    await userEvent.click(screen.getByText('Nouveau produit'))
    expect(screen.getByPlaceholderText('ex: CeraVe Hydrating Cleanser')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('ex: CeraVe')).toBeInTheDocument()
  })

  it("création d'un nouveau produit appelle createProduct puis addUserProduct", async () => {
    const onClose = vi.fn()
    renderWithProviders(<QuickAddModal onClose={onClose} />)

    await userEvent.click(screen.getByText('Nouveau produit'))
    await userEvent.type(screen.getByPlaceholderText('ex: CeraVe Hydrating Cleanser'), 'Mon Sérum')
    await userEvent.type(screen.getByPlaceholderText('ex: CeraVe'), 'Ma Marque')
    await userEvent.click(screen.getByRole('button', { name: /Créer et ajouter/ }))

    await waitFor(() => {
      expect(mockCreateProduct).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Mon Sérum', brand: 'Ma Marque' })
      )
    })
    await waitFor(() => {
      expect(mockAddUserProduct).toHaveBeenCalled()
    })
  })

  it('le bouton fermer appelle onClose', async () => {
    const onClose = vi.fn()
    renderWithProviders(<QuickAddModal onClose={onClose} />)
    await userEvent.click(screen.getByLabelText('Fermer'))
    expect(onClose).toHaveBeenCalled()
  })
})
