import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { UserProduct } from '@/lib/queries/user-products'
import { ProductCardCondensed } from '../ProductCardCondensed'

vi.mock('@/lib/queries/user-products', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/queries/user-products')>()
  return {
    ...actual,
    useUpdateUserProduct: vi.fn(() => ({
      mutate: vi.fn(),
    })),
  }
})

// Card reads prefs via useQuery — stub it.
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQuery: () => ({ data: { criteriaWeights: undefined, displayScale: 'out_of_20' } }),
  }
})

function makeProduct(overrides: Partial<UserProduct> = {}): UserProduct {
  return {
    id: '1',
    userId: 'u1',
    productId: 'p1',
    status: 'in_stock',
    sentiment: 4,
    wouldRepurchase: 'yes',
    comment: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    purchases: [],
    review: {
      id: 'r1',
      userProductId: '1',
      comment: null,
      tolerance: 4,
      efficacy: 4,
      sensoriality: 4,
      stability: 4,
      mixability: 4,
      valueForMoney: 4,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    product: {
      id: 'p1',
      name: 'Sérum HA',
      brand: 'The Ordinary',
      kind: 'skincare',
      unit: 'ml',
      priceCents: 1000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: null,
      url: null,
      createdBy: 'u1',
      inci: null,
      productTags: [],
    },
    ...overrides,
  } as unknown as UserProduct
}

describe('ProductCardCondensed', () => {
  afterEach(() => cleanup())

  it('renders product name and brand', () => {
    render(<ProductCardCondensed p={makeProduct()} onToggleExpand={vi.fn()} />)
    expect(screen.getByText('Sérum HA')).toBeInTheDocument()
    expect(screen.getByText('The Ordinary')).toBeInTheDocument()
  })

  it('renders sentiment emoji', () => {
    render(<ProductCardCondensed p={makeProduct({ sentiment: 5 })} onToggleExpand={vi.fn()} />)
    expect(screen.getByText('😍')).toBeInTheDocument()
  })

  it('calls onToggleExpand when clicked', () => {
    const onToggleExpand = vi.fn()
    render(<ProductCardCondensed p={makeProduct()} onToggleExpand={onToggleExpand} />)
    fireEvent.click(screen.getByText('Sérum HA'))
    expect(onToggleExpand).toHaveBeenCalled()
  })

  it('renders score corner ornament for high score', () => {
    // F2: ornament-only signal. All 4/5 unweighted = 16/20 → score-rare.
    const { container } = render(
      <ProductCardCondensed p={makeProduct()} onToggleExpand={vi.fn()} />
    )
    expect(container.querySelector('.prod-score-corner.score-rare')).toBeInTheDocument()
  })
})
