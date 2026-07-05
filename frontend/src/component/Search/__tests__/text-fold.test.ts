import { describe, expect, it } from 'vitest'

import { foldText } from '../text-fold'

describe('foldText', () => {
  it('lowercases ASCII', () => {
    expect(foldText('Avène')).toBe('avene')
  })

  it('strips diacritics (é → e, à → a, î → i)', () => {
    expect(foldText('Crème')).toBe('creme')
    expect(foldText("Hydratant à l'açaï")).toBe("hydratant a l'acai")
  })

  it('trims surrounding whitespace', () => {
    expect(foldText('  Vitamine C  ')).toBe('vitamine c')
  })

  // Mirrors SQL search_norm(): a double-spaced query must still match facets.
  it('collapses internal whitespace runs like search_norm', () => {
    expect(foldText('acide  salicylique')).toBe('acide salicylique')
    expect(foldText('vitamine \t\n c')).toBe('vitamine c')
  })

  it('returns empty string for empty input', () => {
    expect(foldText('')).toBe('')
  })

  it('handles already-folded input idempotently', () => {
    expect(foldText('vitamine c')).toBe('vitamine c')
  })
})
