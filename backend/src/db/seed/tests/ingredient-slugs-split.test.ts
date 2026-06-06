import { describe, expect, test } from 'bun:test'

import {
  DENTAL_ABRASIFS,
  HAIR_CONDITIONNEURS,
  HUMECTANTS,
  INGREDIENT_SLUGS,
  RETINOIDES,
  SUPPLEMENTS_VITAMINES,
} from '../data/ingredients/ingredient-slugs'

// KNOWN_ALIASES: intentional duplicate values in INGREDIENT_SLUGS.
// HAEMATOCOCCUS_PLUVIALIS → astaxanthine skincare slug
// AVOBENZONE → BUTYL_METHOXYDIBENZOYLMETHANE
const KNOWN_ALIASES = 2

describe('ingredient slugs aggregate', () => {
  test('no unintentional duplicate slug values', () => {
    const keys = Object.keys(INGREDIENT_SLUGS)
    const values = Object.values(INGREDIENT_SLUGS)

    // Fails if a new accidental alias is introduced without updating KNOWN_ALIASES.
    expect(keys.length - new Set(values).size).toBe(KNOWN_ALIASES)

    // Spot-check one slug from each domain stays reachable via the root aggregate.
    expect(INGREDIENT_SLUGS.GLYCERIN).toBe('glycerin')
    expect(INGREDIENT_SLUGS.RETINOL).toBeDefined()
    expect(INGREDIENT_SLUGS.VITAMINE_D3).toBeDefined()
    expect(INGREDIENT_SLUGS.HYDRATED_SILICA).toBeDefined()
    expect(INGREDIENT_SLUGS.SODIUM_LAURYL_SULFATE).toBeDefined()
  })

  test('individual group exports survive the root re-export', () => {
    expect(HUMECTANTS.GLYCERIN).toBe('glycerin')
    expect(RETINOIDES).toBeDefined()
    expect(SUPPLEMENTS_VITAMINES).toBeDefined()
    expect(DENTAL_ABRASIFS).toBeDefined()
    expect(HAIR_CONDITIONNEURS).toBeDefined()
  })
})
