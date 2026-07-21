import { describe, expect, it } from 'bun:test'

import {
  buildInciIndex,
  foldScraperDelimiters,
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

describe('foldScraperDelimiters', () => {
  it('folds spaced-dash bullet separators to commas', () => {
    expect(foldScraperDelimiters('AQUA/WATER -SODIUM METHYL COCOYL TAURATE -GLYCERIN')).toBe(
      'AQUA/WATER, SODIUM METHYL COCOYL TAURATE, GLYCERIN'
    )
    expect(foldScraperDelimiters('TITANIUM DIOXIDE - CI 77491')).toBe('TITANIUM DIOXIDE, CI 77491')
  })

  it('folds semicolons to commas', () => {
    expect(foldScraperDelimiters('MALTODEXTRIN ; MAGNESIUM HYDROXIDE')).toBe(
      'MALTODEXTRIN, MAGNESIUM HYDROXIDE'
    )
  })

  it('keeps real hyphens and digit-adjacent mangled hyphens intact', () => {
    expect(foldScraperDelimiters('PEG-60 HYDROGENATED CASTOR OIL')).toBe(
      'PEG-60 HYDROGENATED CASTOR OIL'
    )
    expect(foldScraperDelimiters('2-BROMO-2 -NITROPROPANE-1,3-DIOL')).toBe(
      '2-BROMO-2 -NITROPROPANE-1,3-DIOL'
    )
    expect(foldScraperDelimiters('C12 - 16 ALCOHOLS')).toBe('C12 - 16 ALCOHOLS')
    expect(foldScraperDelimiters('Sh-Polypeptide -9')).toBe('Sh-Polypeptide -9')
  })

  it('keeps chemical single-letter prefixes and may-contain markers', () => {
    expect(foldScraperDelimiters('P - fenilendiammina')).toBe('P - fenilendiammina')
    expect(foldScraperDelimiters('PARFUM [+/- CI 77891]')).toBe('PARFUM [+/- CI 77891]')
  })

  it('folds after asterisked organic markers', () => {
    expect(foldScraperDelimiters('LAVANDULA OIL** - CYAMOPSIS GUM')).toBe(
      'LAVANDULA OIL**, CYAMOPSIS GUM'
    )
  })

  it('decodes html entities before folding (entity semicolon is not a separator)', () => {
    expect(foldScraperDelimiters('XYLISHINE&trade; - XYLITOL')).toBe('XYLISHINE™, XYLITOL')
    expect(foldScraperDelimiters('&lt;h2&gt;')).toBe('<h2>')
    expect(foldScraperDelimiters('AQUA&nbsp;PARFUM &amp; MENTHA')).toBe('AQUA PARFUM & MENTHA')
    expect(foldScraperDelimiters('CAF&Eacute; &egrave; L’AGRUME')).toBe('CAFÉ è L’AGRUME')
  })

  it('keeps a nested or unknown entity intact instead of folding its semicolon', () => {
    expect(foldScraperDelimiters('&amp;lt;h2&amp;gt;')).toBe('&lt;h2&gt;')
    expect(foldScraperDelimiters('AQUA &copy;; GLYCERIN')).toBe('AQUA &copy;, GLYCERIN')
  })

  it('can decode entities without folding list separators', () => {
    expect(
      foldScraperDelimiters('AQUA; Extrait de Camomille - Acide ascorbique', {
        foldListSeparators: false,
      })
    ).toBe('AQUA; Extrait de Camomille - Acide ascorbique')
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
