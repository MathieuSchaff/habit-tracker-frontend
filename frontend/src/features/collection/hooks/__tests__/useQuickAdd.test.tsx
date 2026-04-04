import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock all external mutation hooks
const mockCreateProductMutateAsync = vi.fn()
const mockAddUserProductMutateAsync = vi.fn()
const mockAddPurchaseMutateAsync = vi.fn()

vi.mock('@/lib/queries/products', () => ({
  useCreateProduct: () => ({ mutateAsync: mockCreateProductMutateAsync, isPending: false }),
  productQueries: {
    checkDuplicate: () => ({
      queryKey: ['products', 'checkDuplicate'],
      queryFn: vi.fn().mockResolvedValue([]),
    }),
  },
}))

vi.mock('@/lib/queries/user-products', () => ({
  useCreateUserProduct: () => ({ mutateAsync: mockAddUserProductMutateAsync, isPending: false }),
}))

vi.mock('@/lib/queries/purchases', () => ({
  useAddPurchase: () => ({ mutateAsync: mockAddPurchaseMutateAsync, isPending: false }),
}))

vi.mock('@/hooks/useScrollLock', () => ({
  useScrollLock: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { toast } from 'sonner'

import { useQuickAdd } from '../useQuickAdd'

describe('useQuickAdd', () => {
  let queryClient: QueryClient
  const onClose = vi.fn()

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    onClose.mockReset()
    mockCreateProductMutateAsync.mockReset()
    mockAddUserProductMutateAsync.mockReset()
    mockAddPurchaseMutateAsync.mockReset()
    vi.mocked(toast.success).mockReset()
    vi.mocked(toast.error).mockReset()
  })

  afterEach(() => {
    queryClient.clear()
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useQuickAdd({ onClose }), { wrapper })

    expect(result.current.activeTab).toBe('existing')
    expect(result.current.selectedProduct).toBeNull()
    expect(result.current.selectedStatus).toBe('in_stock')
    expect(result.current.newName).toBe('')
    expect(result.current.newBrand).toBe('')
    expect(result.current.isPending).toBe(false)
  })

  it('handleAddExisting adds a product with wishlist status', async () => {
    mockAddUserProductMutateAsync.mockResolvedValue({ id: 'up1' })

    const { result } = renderHook(() => useQuickAdd({ onClose }), { wrapper })

    act(() => {
      result.current.setSelectedProduct({
        id: 'p1',
        name: 'Sérum',
        brand: 'La Roche',
        slug: 'serum',
      })
      result.current.setSelectedStatus('wishlist')
    })

    await act(() => result.current.handleAddExisting())

    expect(mockAddUserProductMutateAsync).toHaveBeenCalledWith({
      productId: 'p1',
      status: 'wishlist',
    })
    expect(mockAddPurchaseMutateAsync).not.toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('handleAddExisting with in_stock also creates a purchase', async () => {
    mockAddUserProductMutateAsync.mockResolvedValue({ id: 'up1' })
    mockAddPurchaseMutateAsync.mockResolvedValue({})

    const { result } = renderHook(() => useQuickAdd({ onClose }), { wrapper })

    act(() => {
      result.current.setSelectedProduct({
        id: 'p1',
        name: 'Sérum',
        brand: 'La Roche',
        slug: 'serum',
      })
      result.current.setSelectedStatus('in_stock')
    })

    await act(() => result.current.handleAddExisting())

    expect(mockAddUserProductMutateAsync).toHaveBeenCalledWith({
      productId: 'p1',
      status: 'in_stock',
    })
    expect(mockAddPurchaseMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ userProductId: 'up1' })
    )
    expect(onClose).toHaveBeenCalled()
  })

  it('handleAddExisting does nothing without a selected product', async () => {
    const { result } = renderHook(() => useQuickAdd({ onClose }), { wrapper })

    await act(() => result.current.handleAddExisting())

    expect(mockAddUserProductMutateAsync).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('handleAddExisting shows error toast on failure', async () => {
    mockAddUserProductMutateAsync.mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useQuickAdd({ onClose }), { wrapper })

    act(() => {
      result.current.setSelectedProduct({
        id: 'p1',
        name: 'Sérum',
        brand: 'La Roche',
        slug: 'serum',
      })
    })

    await act(() => result.current.handleAddExisting())

    expect(toast.error).toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('handleCreateAndAdd creates a product then adds it to collection', async () => {
    mockCreateProductMutateAsync.mockResolvedValue({ id: 'new-p1' })
    mockAddUserProductMutateAsync.mockResolvedValue({ id: 'up1' })
    mockAddPurchaseMutateAsync.mockResolvedValue({})

    const { result } = renderHook(() => useQuickAdd({ onClose }), { wrapper })

    act(() => {
      result.current.setNewName('Mon Sérum')
      result.current.setNewBrand('Bioderma')
      result.current.setSelectedStatus('in_stock')
    })

    await act(() => result.current.handleCreateAndAdd())

    expect(mockCreateProductMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Mon Sérum', brand: 'Bioderma' })
    )
    expect(mockAddUserProductMutateAsync).toHaveBeenCalledWith({
      productId: 'new-p1',
      status: 'in_stock',
    })
    expect(mockAddPurchaseMutateAsync).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('handleCreateAndAdd shows error toast on failure', async () => {
    mockCreateProductMutateAsync.mockRejectedValue(new Error('duplicate'))

    const { result } = renderHook(() => useQuickAdd({ onClose }), { wrapper })

    act(() => {
      result.current.setNewName('Sérum')
      result.current.setNewBrand('La Roche')
    })

    await act(() => result.current.handleCreateAndAdd())

    expect(toast.error).toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes on Escape key', () => {
    renderHook(() => useQuickAdd({ onClose }), { wrapper })

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    expect(onClose).toHaveBeenCalled()
  })
})
