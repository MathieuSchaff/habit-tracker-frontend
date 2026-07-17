import type { UserProductStatus } from '@aurore/shared'

import { useNavigate, useRouterState } from '@tanstack/react-router'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import toast from 'react-hot-toast'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { productQueries } from '@/lib/queries/products'
import { useCreateUserProduct } from '@/lib/queries/user-products'
import { useAuthStore } from '@/store/auth'
import { createTestQueryClient, renderWithProviders } from '@/test/utils'
import { ProductCollectionAction } from '../ProductCollectionAction'

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: vi.fn(),
    useRouterState: vi.fn(),
  }
})

vi.mock('@/store/auth', () => ({ useAuthStore: vi.fn() }))

vi.mock('@/lib/queries/user-products', () => ({ useCreateUserProduct: vi.fn() }))

vi.mock('@/lib/queries/products', () => ({
  productQueries: {
    shelfStatus: (userId: string | null, ids: readonly string[]) => ({
      queryKey: ['products', 'shelf-status', userId, ids.join(',')] as const,
      queryFn: async () => new Map<string, UserProductStatus>(),
      enabled: !!userId && ids.length > 0,
      staleTime: 5 * 60 * 1000,
    }),
  },
}))

vi.mock('@/features/products/components/AddToCollectionModal/AddToCollectionModal', () => ({
  AddToCollectionModal: ({ currentStatus }: { currentStatus?: UserProductStatus | null }) => (
    <div role="dialog" data-current-status={currentStatus ?? 'none'}>
      Détails de la collection
    </div>
  ),
}))

vi.mock('@/lib/observability/faro', () => ({ captureFrontendError: vi.fn() }))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

const product = {
  id: 'product-1',
  name: 'Produit test',
  brand: 'Aurore Lab',
  priceCents: 1990,
}

const authenticatedUser = { id: 'user-1' }
const navigate = vi.fn()
const mutateAsync = vi.fn()
let authState: { user: typeof authenticatedUser | null; bootRefreshPending: boolean }

function renderAction(status: UserProductStatus | null = null) {
  const queryClient = createTestQueryClient()
  if (authState.user) {
    const statusMap = new Map<string, UserProductStatus>()
    if (status) statusMap.set(product.id, status)
    queryClient.setQueryData(
      productQueries.shelfStatus(authState.user.id, [product.id]).queryKey,
      statusMap
    )
  }

  renderWithProviders(<ProductCollectionAction product={product} />, { queryClient })
  return queryClient
}

describe('ProductCollectionAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState = { user: authenticatedUser, bootRefreshPending: false }
    mutateAsync.mockResolvedValue({ id: 'user-product-1', status: 'watched' })
    vi.mocked(useAuthStore).mockImplementation((selector) => selector(authState as never))
    vi.mocked(useNavigate).mockReturnValue(navigate)
    vi.mocked(useRouterState).mockReturnValue('/products/produit-test' as never)
    vi.mocked(useCreateUserProduct).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as never)
  })

  it('saves an uncollected product as watched without opening the details dialog', async () => {
    const user = userEvent.setup()
    renderAction()

    await user.click(
      screen.getByRole('button', { name: 'Sauvegarder ce produit dans Garde un œil' })
    )

    expect(mutateAsync).toHaveBeenCalledWith({ productId: product.id, status: 'watched' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith('Sauvegardé dans « Garde un œil »')
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Dans votre collection : Garde un œil/ })
      ).toBeInTheDocument()
    )
  })

  it('keeps the detailed status and purchase flow behind the split-button chevron', async () => {
    const user = userEvent.setup()
    renderAction()

    await user.click(screen.getByRole('button', { name: 'Ajouter avec un statut ou un achat' }))

    expect(mutateAsync).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toHaveAttribute('data-current-status', 'none')
  })

  it('shows the existing shelf status and opens the edit flow without overwriting it', async () => {
    const user = userEvent.setup()
    renderAction('in_stock')

    expect(
      screen.getByRole('button', { name: /Dans votre collection : En stock/ })
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Sauvegarder ce produit/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Dans votre collection : En stock/ }))

    expect(mutateAsync).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toHaveAttribute('data-current-status', 'in_stock')
  })

  it('redirects anonymous save and detail intents to login with the current product URL', async () => {
    const user = userEvent.setup()
    authState = { user: null, bootRefreshPending: false }
    renderAction()

    await user.click(
      screen.getByRole('button', { name: 'Sauvegarder ce produit dans Garde un œil' })
    )
    await user.click(screen.getByRole('button', { name: 'Ajouter avec un statut ou un achat' }))

    expect(mutateAsync).not.toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledTimes(2)
    expect(navigate).toHaveBeenNthCalledWith(1, {
      to: '/auth/login',
      search: { redirect: '/products/produit-test' },
    })
    expect(navigate).toHaveBeenNthCalledWith(2, {
      to: '/auth/login',
      search: { redirect: '/products/produit-test' },
    })
  })
})
