import { describe, expect, test } from 'bun:test'

import {
  DENTAL_ABRASIFS,
  HAIR_CONDITIONNEURS,
  HUMECTANTS,
  INGREDIENT_SLUGS,
  RETINOIDES,
  SUPPLEMENTS_VITAMINES,
} from '../data/ingredients/ingredient-slugs'

// Deliberately brittle count tripwire: bumping these numbers is intentional
// at slug-add time and surfaces in code review. Catches accidental
// dup/drop that the cross-ref checks in seed-data-integrity won't detect.
describe('ingredient slugs aggregate — count tripwire', () => {
  test('INGREDIENT_SLUGS snapshot (exact counts)', () => {
    const keys = Object.keys(INGREDIENT_SLUGS)
    const values = Object.values(INGREDIENT_SLUGS)

    expect(keys.length).toBe(689)

    // 687 = 689 keys − 2 intentional aliases (HAEMATOCOCCUS_PLUVIALIS →
    // astaxanthine skincare slug, AVOBENZONE → BUTYL_METHOXYDIBENZOYLMETHANE).
    expect(new Set(values).size).toBe(687)

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
