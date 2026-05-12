import { describe, expect, it } from 'bun:test'

import {
  buildInciIndex,
  EXCIPIENT_BLOCKLIST,
  inferKeyIngredients,
  normalizeInciToken,
  parseInciFromContent,
  parseInciFromSlugLine,
} from '.'

describe('normalizeInciToken', () => {
  it('uppercases, strips accents, collapses whitespace', () => {
    expect(normalizeInciToken('  Bétaïne  ')).toBe('BETAINE')
    expect(normalizeInciToken('Sodium   Lauryl  Sulfate')).toBe('SODIUM LAURYL SULFATE')
  })

  it('strips parenthetical fragments', () => {
    expect(normalizeInciToken("Glycerin (D'origine végétale)")).toBe('GLYCERIN')
    expect(normalizeInciToken('Citrus Limon (Lemon) Fruit Water')).toBe(
      'CITRUS LIMON  FRUIT WATER'.replace(/\s+/g, ' ')
    )
  })
})

describe('parseInciFromContent', () => {
  it('extracts a single bold token', () => {
    const md = '# Mannitol\n\n## INCI\n**MANNITOL**\n\n## Points forts\n- foo'
    expect(parseInciFromContent(md)).toEqual(['MANNITOL'])
  })

  it('extracts multiple tokens separated by " ou "', () => {
    const md =
      '## INCI\n**CITRUS LIMON FRUIT WATER** ou **CITRUS LIMON FRUIT EXTRACT**\n(CAS: 92346-89-9)\n## Composition'
    expect(parseInciFromContent(md)).toEqual([
      'CITRUS LIMON FRUIT WATER',
      'CITRUS LIMON FRUIT EXTRACT',
    ])
  })

  it('extracts raw uppercase line when no bold', () => {
    const md = '## INCI\nSODIUM HYALURONATE\n## Other'
    expect(parseInciFromContent(md)).toEqual(['SODIUM HYALURONATE'])
  })

  it('handles indented INCI block', () => {
    const md = '    ## INCI\n\n    **Collagen Amino Acids**\n\n    ## Other'
    expect(parseInciFromContent(md)).toEqual(['Collagen Amino Acids'])
  })

  it('stops block at next ## heading or ---', () => {
    const md = '## INCI\n**FOO**\n---\n## Next\n**BAR**'
    expect(parseInciFromContent(md)).toEqual(['FOO'])
  })

  it('returns empty array when no INCI section', () => {
    expect(parseInciFromContent('# Title\nNo inci here')).toEqual([])
  })
})

describe('parseInciFromSlugLine', () => {
  it('parses skincare-style "// INCI: Token | desc"', () => {
    const r = parseInciFromSlugLine(`  MANNITOL: 'mannitol', // INCI: Mannitol | humectant sucre`)
    expect(r).toEqual({ slug: 'mannitol', tokens: ['Mannitol'] })
  })

  it('parses haircare-style "// Token | desc" without INCI: prefix', () => {
    const r = parseInciFromSlugLine(
      `  SLS_HAIR: 'sls-hair', // Sodium Lauryl Sulfate | tensioactif anionique`
    )
    expect(r).toEqual({ slug: 'sls-hair', tokens: ['Sodium Lauryl Sulfate'] })
  })

  it('splits multi-name comments on slash and "ou"', () => {
    const r = parseInciFromSlugLine(
      `  CLOVE: 'clove', // INCI: Eugenia Caryophyllus Bud Oil / Eugenol | analgésique`
    )
    expect(r?.tokens).toEqual(['Eugenia Caryophyllus Bud Oil', 'Eugenol'])
  })

  it('rejects descriptor-style French comments (apostrophes, lowercase words)', () => {
    expect(
      parseInciFromSlugLine(
        `  ESTER_ACIDE_MALIQUE: 'ester-acide-malique', // Ester d'acide malique | AHA doux`
      )
    ).toBeNull()
    expect(
      parseInciFromSlugLine(`  FOO: 'foo', // dérivé acide salicylique | exfoliant doux`)
    ).toBeNull()
  })

  it('returns null on non-slug lines', () => {
    expect(parseInciFromSlugLine('  // a comment')).toBeNull()
    expect(parseInciFromSlugLine('export const FOO = {')).toBeNull()
  })
})

describe('inferKeyIngredients', () => {
  const index = new Map<
    string,
    { slug: string; domain: 'skincare' | 'haircare' | 'dental' | 'supplements' }
  >([
    ['SODIUM HYALURONATE', { slug: 'sodium-hyaluronate', domain: 'skincare' }],
    ['NIACINAMIDE', { slug: 'niacinamide', domain: 'skincare' }],
    ['BUTYROSPERMUM PARKII BUTTER', { slug: 'shea-butter', domain: 'skincare' }],
    ['TOCOPHEROL', { slug: 'tocopherol', domain: 'skincare' }],
  ])

  it('matches tokens in INCI string and preserves order', () => {
    const inci = 'AQUA, GLYCERIN, NIACINAMIDE, BUTYROSPERMUM PARKII BUTTER, SODIUM HYALURONATE'
    expect(inferKeyIngredients(inci, index)).toEqual([
      'niacinamide',
      'shea-butter',
      'sodium-hyaluronate',
    ])
  })

  it('skips excipients listed in blocklist', () => {
    expect(EXCIPIENT_BLOCKLIST.has('AQUA')).toBe(true)
    expect(EXCIPIENT_BLOCKLIST.has('GLYCERIN')).toBe(true)
    const inci = 'AQUA, GLYCERIN, NIACINAMIDE'
    expect(inferKeyIngredients(inci, index)).toEqual(['niacinamide'])
  })

  it('caps result at max', () => {
    const big = new Map<string, { slug: string; domain: 'skincare' }>(
      Array.from({ length: 12 }, (_, i) => [
        `TOK${i}`,
        { slug: `slug-${i}`, domain: 'skincare' as const },
      ])
    )
    const inci = Array.from({ length: 12 }, (_, i) => `TOK${i}`).join(', ')
    expect(inferKeyIngredients(inci, big, { max: 5 })).toHaveLength(5)
  })

  it('dedupes when same slug is hit by multiple synonyms', () => {
    const idx = new Map<string, { slug: string; domain: 'skincare' }>([
      ['HYALURONIC ACID', { slug: 'sodium-hyaluronate', domain: 'skincare' }],
      ['SODIUM HYALURONATE', { slug: 'sodium-hyaluronate', domain: 'skincare' }],
    ])
    const inci = 'HYALURONIC ACID, SODIUM HYALURONATE'
    expect(inferKeyIngredients(inci, idx)).toEqual(['sodium-hyaluronate'])
  })

  it('returns empty for empty INCI', () => {
    expect(inferKeyIngredients('', index)).toEqual([])
  })
})

describe('buildInciIndex (integration)', () => {
  it('builds a non-empty index from real ingredient data', () => {
    const idx = buildInciIndex()
    expect(idx.size).toBeGreaterThan(50)
  })

  it('contains common skincare actives', () => {
    const idx = buildInciIndex()
    expect(idx.has('NIACINAMIDE')).toBe(true)
    expect(idx.has('SODIUM HYALURONATE')).toBe(true)
  })

  it('does not index excipients (blocklist effective)', () => {
    const idx = buildInciIndex()
    expect(idx.has('AQUA')).toBe(false)
    expect(idx.has('GLYCERIN')).toBe(false)
  })
})
