import type { Purchase, RepurchaseFlag, UserProductStatus } from '@habit-tracker/shared'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type RenderOptions, render } from '@testing-library/react'
import type { ReactElement } from 'react'

import type { CriteriaWeights, ReviewCriteria } from '../lib/helpers/reviews'

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { queryClient?: QueryClient }
) {
  const queryClient = options?.queryClient ?? createTestQueryClient()
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
    ...options,
  })
}

export function makeReview(overrides: Partial<ReviewCriteria> = {}): ReviewCriteria {
  return {
    tolerance: null,
    efficacy: null,
    sensoriality: null,
    stability: null,
    mixability: null,
    valueForMoney: null,
    ...overrides,
  }
}

export function makeWeights(overrides: Partial<CriteriaWeights> = {}): CriteriaWeights {
  return {
    tolerance: 1,
    efficacy: 1,
    sensoriality: 1,
    stability: 1,
    mixability: 1,
    valueForMoney: 1,
    ...overrides,
  }
}

export function makeUserProduct(
  overrides: Partial<{
    id: string
    userId: string
    productId: string
    status: UserProductStatus
    qty: number
    sentiment: number | null
    wouldRepurchase: RepurchaseFlag | null
    comment: string | null
    createdAt: string
    updatedAt: string
    product: {
      id: string
      brand: string
      name: string
      createdAt: string
      updatedAt: string
      createdBy: string
      kind: string
      unit: string
      inci: string | null
      description: string | null
      totalAmount: number | null
      priceCents: number | null
      amountUnit: string
      slug: string
      url: string | null
      category: string | null
      imageUrl: string | null
      notes: string | null
      productIngredients: {
        id: string
        createdAt: string
        notes: string | null
        productId: string
        ingredientId: string
        concentrationValue: string | null
        concentrationUnit: string | null
        concentrationPer: string | null
        ingredient: {
          id: string
          name: string
          slug: string
          type: string
          category: string | null
          description: string
          content: string
          createdBy: string
          createdAt: string
          updatedAt: string
        }
      }[]
      tagProducts: {
        productTagId: string
        productId: string
        relevance: 'primary' | 'secondary' | 'avoid'
        productTag: {
          id: string
          slug: string
          label: string
          tagType: string
          createdAt: string
        }
      }[]
    }
    review: {
      id: string
      userProductId: string
      tolerance: number | null
      efficacy: number | null
      sensoriality: number | null
      stability: number | null
      mixability: number | null
      valueForMoney: number | null
      comment: string | null
      createdAt: string
      updatedAt: string
    }
    purchases: Purchase[]
  }> = {}
) {
  return {
    id: 'test-id-1',
    userId: 'test-user-1',
    productId: 'test-product-1',
    status: 'in_stock' as UserProductStatus,
    qty: 1,
    sentiment: null,
    wouldRepurchase: null,
    comment: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    product: {
      id: 'test-product-1',
      brand: 'CeraVe',
      name: 'CeraVe Hydrating Cleanser',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test-user-1',
      kind: 'skincare',
      unit: 'flacon pompe',
      inci: null,
      description: null,
      totalAmount: null,
      priceCents: 1299,
      productIngredients: [],
      tagProducts: [],
      amountUnit: 'ml',
      slug: 'cerave-hydrating-cleanser',
      url: null,
      category: null,
      imageUrl: null,
      notes: null,
    },
    review: {
      id: 'test-review-1',
      userProductId: 'test-id-1',
      tolerance: null,
      efficacy: null,
      sensoriality: null,
      stability: null,
      mixability: null,
      valueForMoney: null,
      comment: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    purchases: [],
    ...overrides,
  }
}
