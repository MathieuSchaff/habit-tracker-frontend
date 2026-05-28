import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import type React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestQueryClient } from '@/test/utils'
import { ProductForm } from '../ProductForm'

const mockSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())

vi.mock('@/features/products/hooks/useProductFormSubmit', () => ({
  useProductFormSubmit: vi.fn(() => ({
    handleSubmit: mockSubmit,
    error: null,
    fieldError: null,
    clearError: vi.fn(),
    isPending: false,
    submitLabel: 'Enregistrer',
  })),
}))

vi.mock('@/lib/queries/products', () => ({
  productQueries: {
    bySlug: vi.fn(() => ({ queryKey: ['products', 'bySlug'], queryFn: vi.fn() })),
    checkDuplicate: vi.fn(() => ({
      queryKey: ['products', 'checkDuplicate'],
      queryFn: vi.fn(async () => []),
    })),
    previewSlug: vi.fn(() => ({
      queryKey: ['products', 'previewSlug'],
      queryFn: vi.fn(async () => null),
    })),
  },
  useAddProductIngredient: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useRemoveProductIngredient: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    variables: undefined,
  })),
  useUpdateProductIngredient: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))

vi.mock('@/lib/queries/product-tags', () => ({
  productTagQueries: {
    list: vi.fn(() => ({
      queryKey: ['product-tags', 'list'],
      queryFn: vi.fn(async () => []),
    })),
  },
}))

// Sub-components that fetch on their own — short-circuit them so the form
// can be exercised without their network surface.
vi.mock('@/features/products/components/BrandCombobox/BrandCombobox', () => ({
  BrandCombobox: ({
    id,
    value,
    onChange,
  }: {
    id: string
    value: string
    onChange: (v: string, confirmed: boolean) => void
  }) => (
    <input
      id={id}
      aria-label="Marque"
      value={value}
      onChange={(e) => onChange(e.target.value, true)}
    />
  ),
}))

vi.mock('@/features/products/components/IngredientSearch/IngredientSearch', () => ({
  IngredientSearch: () => null,
}))

vi.mock('@/features/products/components/ProductForm/ProductImageField', () => ({
  ProductImageField: () => null,
}))

const mockProduct = {
  id: 'p1',
  slug: 'mock-product',
  name: 'Mock Product',
  brand: 'BrandX',
  category: 'skincare',
  kind: 'serum',
  unit: 'pump',
  priceCents: 1299,
  totalAmount: 30,
  amountUnit: 'ml',
  texture: null,
  inci: null,
  description: null,
  notes: null,
  url: null,
  imageUrl: null,
  ingredients: [],
  patents: [],
} as unknown as Parameters<typeof ProductForm>[0] extends { product?: infer P } ? P : never

describe('ProductForm', () => {
  beforeEach(() => {
    mockSubmit.mockClear()
  })

  it('submits the create form once required fields are filled and brand is confirmed', () => {
    const queryClient = createTestQueryClient()
    const onSuccess = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <ProductForm mode="create" onSuccess={onSuccess} />
      </QueryClientProvider>
    )

    fireEvent.change(screen.getByLabelText(/^Nom/), { target: { value: 'Test Sérum' } })
    fireEvent.change(screen.getByLabelText('Marque'), { target: { value: 'BrandX' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Sérum' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Pompe' }))

    const submit = screen.getByRole('button', { name: 'Enregistrer' })
    expect(submit).not.toBeDisabled()

    fireEvent.click(submit)

    expect(mockSubmit).toHaveBeenCalledTimes(1)
  })

  it('submits the edit form once a field has been modified (form becomes dirty)', () => {
    const queryClient = createTestQueryClient()
    const onSuccess = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <ProductForm mode="edit" product={mockProduct} onSuccess={onSuccess} />
      </QueryClientProvider>
    )

    const submit = screen.getByRole('button', { name: 'Enregistrer' })
    // Pristine edit form: dirty=false → submit disabled.
    expect(submit).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/^Nom/), { target: { value: 'Renamed Product' } })

    expect(submit).not.toBeDisabled()
    fireEvent.click(submit)

    expect(mockSubmit).toHaveBeenCalledTimes(1)
  })
})
