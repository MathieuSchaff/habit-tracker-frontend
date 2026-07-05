import { describe, expect, it } from 'vitest'

import { buildListIngredientsQuery } from '../ingredients'

describe('buildListIngredientsQuery — empty', () => {
  it('returns an empty object when no filters are set', () => {
    expect(buildListIngredientsQuery({})).toEqual({})
  })

  it('omits axes with empty arrays', () => {
    expect(buildListIngredientsQuery({ concern: [], skin_type: [] })).toEqual({})
  })
})

describe('buildListIngredientsQuery — axes', () => {
  it('joins multi-value axes with commas', () => {
    expect(
      buildListIngredientsQuery({
        concern: ['acne', 'anti-age'],
        skin_type: ['peau-grasse'],
      })
    ).toEqual({
      concern: 'acne,anti-age',
      skin_type: 'peau-grasse',
    })
  })

  it('serializes every tag axis exposed by the API', () => {
    const result = buildListIngredientsQuery({
      concern: ['acne'],
      skin_type: ['peau-mixte'],
      hair_type: ['fins'],
      age_group: ['adulte'],
      goal: ['hydratation'],
      moment: ['matin'],
      restriction: ['photosensible'],
      ingredient_attribute: ['vegan'],
      skin_effect: ['matifiant'],
      hair_effect: ['volume'],
      dental_effect: ['blanchissant'],
      shared_label: ['clean'],
      actif_class: ['ceramides'],
    })
    expect(Object.keys(result).sort()).toEqual(
      [
        'actif_class',
        'age_group',
        'concern',
        'dental_effect',
        'goal',
        'hair_effect',
        'hair_type',
        'ingredient_attribute',
        'moment',
        'restriction',
        'shared_label',
        'skin_effect',
        'skin_type',
      ].sort()
    )
  })
})

describe('buildListIngredientsQuery — non-axis filters', () => {
  it('maps `type` to `ingredient_type` (route param name divergence)', () => {
    expect(buildListIngredientsQuery({ type: 'skincare' })).toEqual({
      ingredient_type: 'skincare',
    })
  })

  it('joins avoid_for arrays with commas', () => {
    expect(buildListIngredientsQuery({ avoid_for: ['peau-sensible', 'rosacee'] })).toEqual({
      avoid_for: 'peau-sensible,rosacee',
    })
  })

  it('stringifies pagination numerics', () => {
    expect(buildListIngredientsQuery({ page: 2, limit: 50 })).toEqual({
      page: '2',
      limit: '50',
    })
  })

  it('forwards sort when defined', () => {
    expect(buildListIngredientsQuery({ sort: 'name' })).toEqual({ sort: 'name' })
  })

  it('omits page when it is 0 (falsy guard)', () => {
    expect(buildListIngredientsQuery({ page: 0 })).toEqual({})
  })
})
