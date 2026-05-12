import { describe, expect, test } from 'bun:test'

import { isAlphabeticalINCI, stripMarketingPreamble } from '../lib/ingredient-resolver'

describe('stripMarketingPreamble', () => {
  test('slices at "Ingrédients :" marker', () => {
    const inci = 'Marketing prose, with commas, and more. Ingrédients : Aqua, Glycerin, Niacinamide'
    expect(stripMarketingPreamble(inci)).toBe('Aqua, Glycerin, Niacinamide')
  })

  test('slices at "Ingredients:" marker (English, no space)', () => {
    expect(stripMarketingPreamble('Prose. Ingredients: Water, Glycerin')).toBe('Water, Glycerin')
  })

  test('returns input unchanged when no marker present', () => {
    expect(stripMarketingPreamble('Aqua, Glycerin, Niacinamide')).toBe(
      'Aqua, Glycerin, Niacinamide'
    )
  })
})

describe('isAlphabeticalINCI', () => {
  test('detects sorted Korean-style INCI with digit prefix', () => {
    const ingredients = [
      '1 2-hexanediol',
      'aluminum hydroxide',
      'ammonium polyacryloyldimethyl taurate',
      'butylene glycol',
      'caprylic capric triglyceride',
      'caprylyl glycol',
      'centella asiatica extract',
      'ceramide np',
    ]
    expect(isAlphabeticalINCI(ingredients)).toBe(true)
  })

  test('rejects concentration-ordered INCI (water-led serum)', () => {
    const ingredients = [
      'water',
      'isopropyl alcohol',
      'peg-6',
      'glycerin',
      'glycolic acid',
      'silybum marianum',
      'ascorbyl glucoside',
      'acacia',
    ]
    expect(isAlphabeticalINCI(ingredients)).toBe(false)
  })

  test('rejects single-letter repeated tokens (test fixtures: filler1..f8)', () => {
    const ingredients = [
      'filler1',
      'filler2',
      'filler3',
      'filler4',
      'filler5',
      'filler6',
      'filler7',
      'filler8',
    ]
    expect(isAlphabeticalINCI(ingredients)).toBe(false)
  })

  test('rejects short INCI even when sorted (< 5 letter-tokens)', () => {
    expect(isAlphabeticalINCI(['a', 'b', 'c'])).toBe(false)
  })

  test('rejects when window is sorted but only 2 distinct first letters', () => {
    expect(isAlphabeticalINCI(['acetic', 'adenosine', 'alpha', 'aqua', 'butylene'])).toBe(false)
  })

  test('accepts when 3+ distinct first letters and sorted', () => {
    expect(isAlphabeticalINCI(['acetic', 'adenosine', 'butylene', 'caprylic', 'glycerin'])).toBe(
      true
    )
  })
})
