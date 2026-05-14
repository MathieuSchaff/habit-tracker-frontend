import type { EnrichedComparisonProduct } from '@habit-tracker/shared'

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ComparisonBody } from '../components/ComparisonBody'

type Ingredient = EnrichedComparisonProduct['ingredients'][number]

const ing = (slug: string, signals: Ingredient['signals'] = []): Ingredient => ({
  id: slug,
  inciName: slug,
  slug,
  position: 0,
  signals,
})

const make = (id: string, ingredients: Ingredient[]): EnrichedComparisonProduct => ({
  id,
  name: id,
  brand: 'X',
  kind: 'serum',
  slug: id,
  imageUrl: null,
  totalAmount: 50,
  amountUnit: 'ml',
  priceCents: 1000,
  pricePer: { unit: 'ml', cents: 20 },
  ingredients,
  tags: [],
})

describe('ComparisonBody', () => {
  it('renders shared actives in signals section', () => {
    const a = make('a', [ing('water'), ing('niacinamide', ['active'])])
    const b = make('b', [ing('water'), ing('niacinamide', ['active'])])
    render(<ComparisonBody products={[a, b]} />)
    expect(screen.getByText('Actifs partagés')).toBeDefined()
    // niacinamide renders both as a shared-active pill and in the common
    // ingredients section, so multiple matches are expected.
    expect(screen.getAllByText('niacinamide').length).toBeGreaterThan(0)
  })

  it('shows alerts with present-in count', () => {
    const a = make('a', [ing('parfum', ['alert'])])
    const b = make('b', [ing('water')])
    render(<ComparisonBody products={[a, b]} />)
    // Alert pill renders the count inline as "(1/2)" — text node split between
    // the inci name span and the detail span, so match the parenthetical only.
    expect(screen.getByText(/\(1\/2\)/)).toBeDefined()
  })

  it('flags mixed-unit prices as not comparable', () => {
    const a = make('a', [ing('water')])
    const b: EnrichedComparisonProduct = {
      ...make('b', [ing('water')]),
      amountUnit: 'g',
      pricePer: { unit: 'g', cents: 50 },
    }
    render(<ComparisonBody products={[a, b]} />)
    expect(screen.getAllByText('Prix non comparable').length).toBeGreaterThan(0)
  })
})
