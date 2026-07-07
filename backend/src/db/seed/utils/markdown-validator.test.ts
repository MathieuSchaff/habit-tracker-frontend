// validateTables once treated every `|` line as a table header, so each data
// row after the separator was flagged as a bad separator line. Guard the fix:
// only a block's header row is checked, and multi-row tables stay clean.

import { describe, expect, it } from 'bun:test'

import { type IngredientSeed, validateAllIngredients } from './markdown-validator'

const withContent = (content: string): IngredientSeed => ({
  name: 'Test',
  slug: 'test',
  type: 'skincare',
  category: 'hydratant',
  description: 'desc',
  content,
})

const separatorWarnings = (content: string) =>
  validateAllIngredients([withContent(content)]).results[0].warnings.filter((w) =>
    w.includes('séparation invalide')
  )

describe('validateTables', () => {
  it('accepts a well-formed multi-row table', () => {
    const table = '| A | B |\n|---|---|\n| x | y |\n| z | w |\n| p | q |'
    expect(separatorWarnings(table)).toHaveLength(0)
  })

  it('flags a header not followed by a separator row', () => {
    const table = '| A | B |\n| x | y |'
    expect(separatorWarnings(table)).toHaveLength(1)
  })
})
