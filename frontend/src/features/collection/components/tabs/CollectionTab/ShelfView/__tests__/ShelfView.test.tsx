import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { UserProduct } from '@/lib/queries/user-products'
import { ShelfView } from '../ShelfView'

vi.mock('@/lib/queries/user-products', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/queries/user-products')>()
  return { ...actual, useUpdateUserProduct: vi.fn(() => ({ mutate: vi.fn() })) }
})

function makeProduct(id: string, status: string, name: string): UserProduct {
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
    product: { id: `p-${id}`, name, brand: 'Brand' },
  } as unknown as UserProduct
}

describe('ShelfView', () => {
  it('renders sections in SHELF_ORDER', () => {
    const products = [
      makeProduct('1', 'wishlist', 'Produit A'),
      makeProduct('2', 'in_stock', 'Produit B'),
      makeProduct('3', 'holy_grail', 'Produit C'),
    ]
    render(<ShelfView products={products} onStatusChange={vi.fn()} />)

    const labels = screen.getAllByRole('button').map((b) => b.textContent)
    const graalIdx = labels.findIndex((l) => l?.includes('Saint Graal'))
    const stockIdx = labels.findIndex((l) => l?.includes('En stock'))
    const wishIdx = labels.findIndex((l) => l?.includes('Wishlist'))

    // holy_grail before in_stock before wishlist
    expect(graalIdx).toBeLessThan(stockIdx)
    expect(stockIdx).toBeLessThan(wishIdx)
  })

  it('hides sections with no products', () => {
    const products = [makeProduct('1', 'in_stock', 'Produit A')]
    render(<ShelfView products={products} onStatusChange={vi.fn()} />)

    expect(screen.getByText('En stock')).toBeInTheDocument()
    expect(screen.queryByText('Wishlist')).not.toBeInTheDocument()
    expect(screen.queryByText('Archivé')).not.toBeInTheDocument()
  })

  it('renders all products within their sections', () => {
    const products = [
      makeProduct('1', 'in_stock', 'Sérum'),
      makeProduct('2', 'in_stock', 'Crème'),
      makeProduct('3', 'wishlist', 'Tonique'),
    ]
    render(<ShelfView products={products} onStatusChange={vi.fn()} />)

    expect(screen.getByText('Sérum')).toBeInTheDocument()
    expect(screen.getByText('Crème')).toBeInTheDocument()
    expect(screen.getByText('Tonique')).toBeInTheDocument()
  })

  it('renders empty state when no products', () => {
    render(<ShelfView products={[]} onStatusChange={vi.fn()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
