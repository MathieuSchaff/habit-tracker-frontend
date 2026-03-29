import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { UserProduct } from '@/lib/queries/user-products'
import { ShelfView } from '../ShelfView'

vi.mock('@/lib/queries/user-products', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/queries/user-products')>()
  return {
    ...actual,
    useUpdateUserProduct: vi.fn(() => ({
      mutate: vi.fn(),
    })),
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

describe('ShelfView', () => {
  it('renders sections and products', () => {
    const products = [
      makeProduct('1', 'holy_grail', 'Produit C'),
      makeProduct('2', 'in_stock', 'Produit B'),
      makeProduct('3', 'wishlist', 'Produit A'),
    ]
    render(
      <ShelfView
        products={products}
        onStatusChange={vi.fn()}
        onToggleExpand={vi.fn()}
        criteriaWeights={undefined}
        displayScale={undefined}
      />
    )

    expect(screen.getByText('Saint Graal')).toBeInTheDocument()
    expect(screen.getByText('En stock')).toBeInTheDocument()
    expect(screen.getByText('Wishlist')).toBeInTheDocument()

    expect(screen.getByText('Produit C')).toBeInTheDocument()
    expect(screen.getByText('Produit B')).toBeInTheDocument()
    expect(screen.getByText('Produit A')).toBeInTheDocument()
  })

  it('hides sections with no products', () => {
    const products = [makeProduct('1', 'in_stock', 'Produit A')]
    render(
      <ShelfView
        products={products}
        onStatusChange={vi.fn()}
        onToggleExpand={vi.fn()}
        criteriaWeights={undefined}
        displayScale={undefined}
      />
    )

    expect(screen.getByText('En stock')).toBeInTheDocument()
    expect(screen.queryByText('Wishlist')).not.toBeInTheDocument()
    expect(screen.queryByText('Archivé')).not.toBeInTheDocument()
  })

  it('renders empty state when no products', () => {
    render(
      <ShelfView
        products={[]}
        onStatusChange={vi.fn()}
        onToggleExpand={vi.fn()}
        criteriaWeights={undefined}
        displayScale={undefined}
      />
    )
    expect(screen.queryByText('En stock')).not.toBeInTheDocument()
  })
})
