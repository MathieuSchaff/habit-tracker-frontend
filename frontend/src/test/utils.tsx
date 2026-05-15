import type {
  IngredientType,
  Patent,
  PreferencesTag,
  ProductCategory,
  ProductKind,
  ProductTexture,
  ProductUnit,
  Purchase,
  RepurchaseFlag,
  RessentiTag,
  RoutineTag,
  SkincareIngredientCategory,
  SupplementCategory,
  UserProductStatus,
} from '@habit-tracker/shared'

import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { type RenderOptions, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { Suspense } from 'react'
import { vi } from 'vitest'

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
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={null}>{children}</Suspense>
      </QueryClientProvider>
    ),
    ...options,
  })
}

// Routes `useQuery` results by `queryKey[0]`. Tests must `vi.mock('@tanstack/react-query', ...)`
// to expose `useQuery` as a vi.fn before calling this.
export function mockUseQueryByKey(map: Record<string, unknown>): void {
  vi.mocked(useQuery).mockImplementation((options: any) => {
    const key = options.queryKey?.[0]
    return { data: map[key], isLoading: false } as any
  })
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
    ressenti: RessentiTag[]
    routine: RoutineTag[]
    preferences: PreferencesTag[]
    createdAt: string
    updatedAt: string
    product: {
      id: string
      brand: string
      name: string
      createdAt: string
      updatedAt: string
      createdBy: string
      kind: ProductKind
      texture: ProductTexture | null
      unit: ProductUnit
      inci: string | null
      description: string | null
      totalAmount: number | null
      priceCents: number | null
      amountUnit: string
      slug: string
      url: string | null
      patents: Patent[]
      category: ProductCategory
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
          type: IngredientType
          category: SkincareIngredientCategory | SupplementCategory | null
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
    ressenti: [] as RessentiTag[],
    routine: [] as RoutineTag[],
    preferences: [] as PreferencesTag[],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    product: {
      id: 'test-product-1',
      brand: 'CeraVe',
      name: 'CeraVe Hydrating Cleanser',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test-user-1',
      kind: 'cleanser' as ProductKind,
      texture: null,
      unit: 'pump' as ProductUnit,
      inci: null,
      description: null,
      totalAmount: null,
      priceCents: 1299,
      productIngredients: [],
      tagProducts: [],
      amountUnit: 'ml',
      slug: 'cerave-hydrating-cleanser',
      url: null,
      patents: [],
      category: 'skincare' as ProductCategory,
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
