import { describe, expect, it } from 'vitest'

import type { ProductDetail } from '@/lib/queries/products'
import {
  emptyProductEditForm,
  productEditFormToCreateInput,
  productEditFormToUpdateInput,
  productToEditForm,
} from '../ProductForm.schema'

function makeProductDetail(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: 'p1',
    slug: 'product-x',
    name: 'Product X',
    brand: 'Brand X',
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
    ...overrides,
  } as unknown as ProductDetail
}

describe('productToEditForm', () => {
  it('coerces nullable DB fields to empty strings so DOM inputs stay controlled', () => {
    const result = productToEditForm(
      makeProductDetail({
        texture: null,
        inci: null,
        description: null,
        notes: null,
        url: null,
        imageUrl: null,
      })
    )
    expect(result.texture).toBe('')
    expect(result.inci).toBe('')
    expect(result.description).toBe('')
    expect(result.notes).toBe('')
    expect(result.url).toBe('')
    expect(result.imageUrl).toBe('')
  })

  it('formats priceCents into a fixed-2 euro string', () => {
    expect(productToEditForm(makeProductDetail({ priceCents: 1299 })).priceEuros).toBe('12.99')
    expect(productToEditForm(makeProductDetail({ priceCents: 500 })).priceEuros).toBe('5.00')
  })

  it('renders empty priceEuros when priceCents is null', () => {
    expect(productToEditForm(makeProductDetail({ priceCents: null })).priceEuros).toBe('')
  })

  it('serializes totalAmount as string and null as empty', () => {
    expect(productToEditForm(makeProductDetail({ totalAmount: 30 })).totalAmount).toBe('30')
    expect(productToEditForm(makeProductDetail({ totalAmount: null })).totalAmount).toBe('')
  })
})

describe('productEditFormToCreateInput', () => {
  const baseForm = {
    ...emptyProductEditForm(),
    name: 'Test',
    brand: 'BrandX',
    kind: 'serum',
    unit: 'pump',
  }

  it('omits optional fields when their string value is empty', () => {
    const result = productEditFormToCreateInput(baseForm)
    expect(result.slug).toBeUndefined()
    expect(result.priceCents).toBeUndefined()
    expect(result.totalAmount).toBeUndefined()
    expect(result.amountUnit).toBeUndefined()
    expect(result.texture).toBeUndefined()
    expect(result.inci).toBeUndefined()
    expect(result.description).toBeUndefined()
    expect(result.notes).toBeUndefined()
    expect(result.url).toBeUndefined()
    expect(result.imageUrl).toBeUndefined()
  })

  it('converts priceEuros to cents via Math.round (handles float fuzz)', () => {
    expect(productEditFormToCreateInput({ ...baseForm, priceEuros: '12.99' }).priceCents).toBe(1299)
    expect(productEditFormToCreateInput({ ...baseForm, priceEuros: '5' }).priceCents).toBe(500)
    expect(productEditFormToCreateInput({ ...baseForm, priceEuros: '0.10' }).priceCents).toBe(10)
  })

  it('parses totalAmount as base-10 integer', () => {
    expect(productEditFormToCreateInput({ ...baseForm, totalAmount: '30' }).totalAmount).toBe(30)
  })

  it('trims string fields so accidental whitespace never reaches the API', () => {
    const result = productEditFormToCreateInput({
      ...baseForm,
      name: '  Spaced  ',
      brand: '  Brand  ',
      inci: '  aqua, glycerin  ',
    })
    expect(result.name).toBe('Spaced')
    expect(result.brand).toBe('Brand')
    expect(result.inci).toBe('aqua, glycerin')
  })
})

describe('productEditFormToUpdateInput', () => {
  const original = makeProductDetail({
    priceCents: 1299,
    totalAmount: 30,
    amountUnit: 'ml',
    texture: null,
    inci: 'water, glycerin',
  })

  function form(overrides: Partial<ReturnType<typeof emptyProductEditForm>> = {}) {
    return { ...productToEditForm(original), ...overrides }
  }

  it('omits a field when it stays empty AND original is null (nothing to clear)', () => {
    const result = productEditFormToUpdateInput(form({ texture: '' }), original)
    // texture: '' + original null → undefined (omit)
    expect(result.texture).toBeUndefined()
  })

  it('sends null when a previously-set field is cleared (explicit unset)', () => {
    const result = productEditFormToUpdateInput(form({ priceEuros: '' }), original)
    // priceEuros cleared + original had priceCents → null
    expect(result.priceCents).toBeNull()
  })

  it('keeps slug undefined when value is unchanged so the URL stays stable', () => {
    const result = productEditFormToUpdateInput(form({ slug: original.slug }), original)
    expect(result.slug).toBeUndefined()
  })

  it('sends slug only when explicitly changed', () => {
    const result = productEditFormToUpdateInput(form({ slug: 'new-slug' }), original)
    expect(result.slug).toBe('new-slug')
  })

  it('sends the new priceCents (rounded) when priceEuros changes', () => {
    const result = productEditFormToUpdateInput(form({ priceEuros: '19.99' }), original)
    expect(result.priceCents).toBe(1999)
  })
})
