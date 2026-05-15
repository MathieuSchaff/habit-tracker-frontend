// Shared fixtures for collection integration tests. `vi.mock` factories must
// stay inlined per file (hoisted; cannot import), so this only covers data
// constants and the user-product shape factory.

export const defaultCollectionSearch = {
  q: '',
  sort: 'name',
  brand: 'all',
  productType: 'all',
  sentiment: 'all',
  repurchase: 'all',
  minNote: 0,
  maxPrice: '',
}

export const mockPrefs = {
  displayScale: 'out_of_20',
  criteriaWeights: { tolerance: 1, efficacy: 1 },
}

type UserProductOverrides = {
  id?: string
  status?: string
  qty?: number
  sentiment?: number | null
  wouldRepurchase?: 'yes' | 'no' | null
  productId?: string
  product?: { name: string; brand: string; kind: string; priceCents: number }
  review?: { tolerance: number; efficacy: number } | null
  ressenti?: string[]
  routine?: string[]
  preferences?: string[]
}

export function makeUserProductMock(overrides: UserProductOverrides = {}) {
  return {
    id: 'up-1',
    status: 'in_stock',
    qty: 1,
    sentiment: null,
    wouldRepurchase: null,
    updatedAt: new Date().toISOString(),
    product: { name: 'Sample', brand: 'Sample Brand', kind: 'Serum', priceCents: 1000 },
    review: null,
    ressenti: [],
    routine: [],
    preferences: [],
    ...overrides,
  }
}
