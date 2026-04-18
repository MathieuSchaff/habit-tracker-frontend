import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UserProduct } from '@/lib/queries/user-products'
import { ShelfView } from '../ShelfView'

vi.mock('@/lib/queries/user-products', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/queries/user-products')>()
  return {
    ...actual,
    useUpdateUserProduct: vi.fn(() => ({ mutate: vi.fn() })),
  }
})

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQuery: () => ({ data: { criteriaWeights: undefined, displayScale: 'out_of_20' } }),
  }
})

function makeProduct(id: string, status: UserProduct['status'], name: string): UserProduct {
  return {
    id,
    userId: 'u1',
    productId: `p-${id}`,
    status,
    sentiment: null,
    wouldRepurchase: null,
    comment: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    purchases: [],
    review: null,
    product: {
      id: `p-${id}`,
      name,
      brand: 'Brand',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: null,
      url: null,
      createdBy: 'u1',
      kind: 'skincare',
      unit: 'ml',
      priceCents: 1000,
      inci: null,
      productTags: [],
    },
  } as unknown as UserProduct
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('ShelfView', () => {
  const noop = () => {}

  it('shows FirstTimeEmpty when products list is empty', () => {
    const onAdd = vi.fn()
    render(
      <ShelfView
        products={[]}
        onStatusChange={noop}
        onStatusChangeMany={noop}
        onToggleExpand={noop}
        onAddClick={onAdd}
      />,
    )
    expect(screen.getByText(/étagère est vide/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /ajouter mon premier/i }))
    expect(onAdd).toHaveBeenCalledOnce()
  })

  it('renders Tout + status tabs with accurate counts', () => {
    const products = [
      makeProduct('1', 'holy_grail', 'Grail A'),
      makeProduct('2', 'holy_grail', 'Grail B'),
      makeProduct('3', 'in_stock', 'Stock A'),
    ]
    render(
      <ShelfView
        products={products}
        onStatusChange={noop}
        onStatusChangeMany={noop}
        onToggleExpand={noop}
        onAddClick={noop}
      />,
    )
    const tout = screen.getByRole('tab', { name: /tout/i })
    expect(tout).toHaveAttribute('aria-selected', 'true')
    expect(tout).toHaveTextContent('3')
  })

  it('filters products when switching tabs', () => {
    const products = [
      makeProduct('1', 'holy_grail', 'Grail A'),
      makeProduct('2', 'in_stock', 'Stock A'),
    ]
    render(
      <ShelfView
        products={products}
        onStatusChange={noop}
        onStatusChangeMany={noop}
        onToggleExpand={noop}
        onAddClick={noop}
      />,
    )
    expect(screen.getByText('Grail A')).toBeInTheDocument()
    expect(screen.getByText('Stock A')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /saint graal/i }))
    expect(screen.getByText('Grail A')).toBeInTheDocument()
    expect(screen.queryByText('Stock A')).not.toBeInTheDocument()
  })

  it('shows a per-shelf empty state for a status tab with no products', () => {
    const products = [makeProduct('1', 'in_stock', 'Stock A')]
    render(
      <ShelfView
        products={products}
        onStatusChange={noop}
        onStatusChangeMany={noop}
        onToggleExpand={noop}
        onAddClick={noop}
      />,
    )
    fireEvent.click(screen.getByRole('tab', { name: /wishlist/i }))
    expect(screen.getByText(/Wishlist vide/i)).toBeInTheDocument()
  })

  it('persists the active tab in localStorage', () => {
    const products = [makeProduct('1', 'wishlist', 'Wish A')]
    const { unmount } = render(
      <ShelfView
        products={products}
        onStatusChange={noop}
        onStatusChangeMany={noop}
        onToggleExpand={noop}
        onAddClick={noop}
      />,
    )
    fireEvent.click(screen.getByRole('tab', { name: /wishlist/i }))
    expect(window.localStorage.getItem('collection:activeShelf')).toBe('wishlist')
    unmount()

    render(
      <ShelfView
        products={products}
        onStatusChange={noop}
        onStatusChangeMany={noop}
        onToggleExpand={noop}
        onAddClick={noop}
      />,
    )
    expect(screen.getByRole('tab', { name: /wishlist/i })).toHaveAttribute('aria-selected', 'true')
  })
})
