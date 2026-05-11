import { describe, expect, it } from 'bun:test'

import { createIngredientSchema, updateIngredientSchema } from '@habit-tracker/shared'

describe('createIngredientSchema — type × category cross-check', () => {
  it('accepts category from the matching type set', () => {
    const r = createIngredientSchema.safeParse({
      name: 'Niacinamide',
      type: 'skincare',
      category: 'actif',
    })
    expect(r.success).toBe(true)
  })

  it('rejects skincare ingredient with haircare-only category', () => {
    const r = createIngredientSchema.safeParse({
      name: 'Misfit',
      type: 'skincare',
      category: 'conditionneur',
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0].path).toEqual(['category'])
    }
  })

  it('rejects unknown category for any type', () => {
    const r = createIngredientSchema.safeParse({
      name: 'Bogus',
      type: 'skincare',
      category: 'vitamine',
    })
    expect(r.success).toBe(false)
  })

  it('accepts missing category (optional)', () => {
    const r = createIngredientSchema.safeParse({ name: 'Bare', type: 'haircare' })
    expect(r.success).toBe(true)
  })
})

describe('updateIngredientSchema — type × category cross-check', () => {
  it('accepts partial update with no type and any category — service merges later', () => {
    const r = updateIngredientSchema.safeParse({ category: 'whatever' })
    expect(r.success).toBe(true)
  })

  it('validates when both type and category are present', () => {
    const ok = updateIngredientSchema.safeParse({ type: 'dental', category: 'actif' })
    expect(ok.success).toBe(true)

    const bad = updateIngredientSchema.safeParse({ type: 'dental', category: 'filtre-uv' })
    expect(bad.success).toBe(false)
  })

  it('accepts null category (clear)', () => {
    const r = updateIngredientSchema.safeParse({ type: 'skincare', category: null })
    expect(r.success).toBe(true)
  })
})
