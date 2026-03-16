import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement } from 'react'
import type { UserProductStatus, RepurchaseFlag } from '@habit-tracker/shared'
import type { ReviewCriteria, CriteriaWeights } from '../lib/helpers/reviews'

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

export function makeUserProduct(overrides: Partial<{
  id: string
  status: UserProductStatus
  qty: number
  sentiment: number | null
  wouldRepurchase: RepurchaseFlag | null
  comment: string | null
  updatedAt: string
  product: { name: string; brand: string; kind: string; priceCents: number | null; unit: string }
  review: ReviewCriteria | null
}> = {}) {
  return {
    id: 'test-id-1',
    status: 'in_stock' as UserProductStatus,
    qty: 1,
    sentiment: null,
    wouldRepurchase: null,
    comment: null,
    updatedAt: new Date().toISOString(),
    product: {
      name: 'CeraVe Hydrating Cleanser',
      brand: 'CeraVe',
      kind: 'skincare',
      priceCents: 1299,
      unit: 'flacon pompe',
    },
    review: null,
    ...overrides,
  }
}
