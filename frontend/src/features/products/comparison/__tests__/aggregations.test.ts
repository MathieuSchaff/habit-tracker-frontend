import { describe, expect, it } from 'vitest'

import type { EnrichedComparisonProduct } from '@habit-tracker/shared'

import {
  computeAlerts,
  computeCommon,
  computeConflicts,
  computeSharedActives,
  computeSpecifics,
} from '../helpers/aggregations'

const ing = (id: string, slug: string, signals: ('active' | 'alert')[] = []) => ({
  id,
  inciName: slug,
  slug,
  position: 0,
  signals,
})

const prod = (id: string, ingredients: ReturnType<typeof ing>[]): EnrichedComparisonProduct => ({
  id,
  name: id,
  brand: 'X',
  kind: 'serum',
  slug: id,
  imageUrl: null,
  totalAmount: null,
  amountUnit: null,
  priceCents: null,
  pricePer: null,
  ingredients,
  tags: [],
})

describe('computeCommon', () => {
  it('returns ingredients present in all products', () => {
    const a = prod('a', [ing('1', 'water'), ing('2', 'glycerin')])
    const b = prod('b', [ing('1', 'water'), ing('3', 'niacinamide')])
    expect(computeCommon([a, b]).map((i) => i.slug)).toEqual(['water'])
  })
})

describe('computeSpecifics', () => {
  it('returns ingredients only on one product', () => {
    const a = prod('a', [ing('1', 'water'), ing('2', 'glycerin')])
    const b = prod('b', [ing('1', 'water'), ing('3', 'niacinamide')])
    const result = computeSpecifics([a, b])
    expect(result.get('a')?.map((i) => i.slug)).toEqual(['glycerin'])
    expect(result.get('b')?.map((i) => i.slug)).toEqual(['niacinamide'])
  })
})

describe('computeSharedActives', () => {
  it('returns common ingredients flagged active', () => {
    const a = prod('a', [ing('1', 'water'), ing('2', 'niacinamide', ['active'])])
    const b = prod('b', [ing('1', 'water'), ing('2', 'niacinamide', ['active'])])
    expect(computeSharedActives([a, b]).map((i) => i.slug)).toEqual(['niacinamide'])
  })
})

describe('computeAlerts', () => {
  it('reports each alert ingredient with present-in count', () => {
    const a = prod('a', [ing('1', 'parfum', ['alert']), ing('2', 'water')])
    const b = prod('b', [ing('1', 'parfum', ['alert'])])
    const c = prod('c', [ing('3', 'alcool-denat', ['alert'])])
    const alerts = computeAlerts([a, b, c])
    expect(alerts.find((x) => x.slug === 'parfum')?.presentIn).toEqual(['a', 'b'])
    expect(alerts.find((x) => x.slug === 'alcool-denat')?.presentIn).toEqual(['c'])
  })
})

describe('computeConflicts', () => {
  it('flags retinol + glycolic across the union', () => {
    const a = prod('a', [ing('1', 'retinol')])
    const b = prod('b', [ing('2', 'glycolic-acid')])
    const conflicts = computeConflicts([a, b])
    expect(conflicts.length).toBe(1)
    expect(conflicts[0]?.severity).toBe('warn')
  })
})
