import { describe, expect, test } from 'bun:test'

import {
  aggregateBrandClaims,
  brandToObfSlug,
  classifyLabel,
  mergeObfSourcesIntoExisting,
  type ObfRow,
  parseObfCsvLine,
  stripObfPrefix,
} from './lib'

describe('brandToObfSlug', () => {
  test('lowercases + strips accents', () => {
    expect(brandToObfSlug('Avène')).toBe('avene')
    expect(brandToObfSlug('Caudalie')).toBe('caudalie')
  })

  test('preserves existing dashes inside the slug', () => {
    expect(brandToObfSlug('La Roche-Posay')).toBe('la-roche-posay')
  })

  test('replaces apostrophes and whitespace with single dashes', () => {
    expect(brandToObfSlug("L'Oréal")).toBe('l-oreal')
    expect(brandToObfSlug("I'm From")).toBe('i-m-from')
    expect(brandToObfSlug('Some By Mi')).toBe('some-by-mi')
    expect(brandToObfSlug('Mary&May')).toBe('mary-may')
  })

  test('collapses runs of separators and trims edges', () => {
    expect(brandToObfSlug('  --weleda--  ')).toBe('weleda')
    expect(brandToObfSlug('Dr. Jart+')).toBe('dr-jart')
  })
})

describe('stripObfPrefix', () => {
  test('drops language prefix', () => {
    expect(stripObfPrefix('xx:l-oreal')).toBe('l-oreal')
    expect(stripObfPrefix('en:vegan')).toBe('vegan')
    expect(stripObfPrefix('fr:cosmebio')).toBe('cosmebio')
  })

  test('passes through tags without colon', () => {
    expect(stripObfPrefix('plain-tag')).toBe('plain-tag')
  })
})

describe('classifyLabel', () => {
  test('maps OBF labels to brand-level cert flags', () => {
    expect(classifyLabel('en:vegan')).toBe('vegan')
    expect(classifyLabel('en:cruelty-free')).toBe('crueltyFree')
    expect(classifyLabel('en:peta-cruelty-free')).toBe('crueltyFree')
    expect(classifyLabel('en:leaping-bunny')).toBe('crueltyFree')
    expect(classifyLabel('en:cosmos-organic')).toBe('naturalCertified')
    expect(classifyLabel('fr:ecocert')).toBe('naturalCertified')
    expect(classifyLabel('fr:cosmetique-bio-charte-cosmebio')).toBe('naturalCertified')
  })

  test('returns null for unrelated labels', () => {
    expect(classifyLabel('en:made-in-france')).toBeNull()
    expect(classifyLabel('en:gluten-free')).toBeNull()
  })
})

describe('aggregateBrandClaims', () => {
  const rows: ObfRow[] = [
    { brandTags: ['xx:foo'], labelTags: ['en:vegan', 'en:cruelty-free'] },
    { brandTags: ['xx:foo'], labelTags: ['en:vegan'] },
    { brandTags: ['xx:foo'], labelTags: ['en:cruelty-free'] },
    { brandTags: ['xx:foo'], labelTags: [] },
    { brandTags: ['xx:bar'], labelTags: ['en:cosmos-organic'] },
    { brandTags: ['xx:single-product'], labelTags: ['en:vegan'] },
  ]

  test('vegan claim fires when ratio ≥ threshold AND total ≥ minProducts', () => {
    const out = aggregateBrandClaims(rows, {
      ratioThreshold: 0.5,
      minProducts: 2,
      minLabelCount: 999,
    })
    const foo = out.get('foo')
    expect(foo?.total).toBe(4)
    expect(foo?.vegan.count).toBe(2)
    expect(foo?.vegan.ratio).toBe(0.5)
    expect(foo?.vegan.claim).toBe(true)
  })

  test('cruelty-free claim same threshold semantics', () => {
    const out = aggregateBrandClaims(rows, {
      ratioThreshold: 0.5,
      minProducts: 2,
      minLabelCount: 999,
    })
    expect(out.get('foo')?.crueltyFree.claim).toBe(true)
  })

  test('single-product brand fails minProducts even at ratio 1.0', () => {
    const out = aggregateBrandClaims(rows, {
      ratioThreshold: 0.5,
      minProducts: 2,
      minLabelCount: 999,
    })
    expect(out.get('single-product')?.vegan.claim).toBe(false)
  })

  test('whitelist drops out-of-corpus brands entirely', () => {
    const out = aggregateBrandClaims(rows, {
      ratioThreshold: 0.5,
      minProducts: 2,
      brandWhitelist: new Set(['foo']),
    })
    expect(out.get('foo')).toBeDefined()
    expect(out.get('bar')).toBeUndefined()
  })

  test('strict threshold (0.8) rejects 50%-tagged brand', () => {
    const out = aggregateBrandClaims(rows, {
      ratioThreshold: 0.8,
      minProducts: 2,
      minLabelCount: 999,
    })
    expect(out.get('foo')?.vegan.claim).toBe(false)
  })

  test('multi-brand row counts toward each listed brand', () => {
    const multi: ObfRow[] = [
      { brandTags: ['xx:a', 'xx:b'], labelTags: ['en:vegan'] },
      { brandTags: ['xx:a', 'xx:b'], labelTags: ['en:vegan'] },
    ]
    const out = aggregateBrandClaims(multi, {
      ratioThreshold: 0.5,
      minProducts: 2,
      minLabelCount: 999,
    })
    expect(out.get('a')?.vegan.count).toBe(2)
    expect(out.get('b')?.vegan.count).toBe(2)
  })

  test('count rule fires when ratio is too low but absolute count is high', () => {
    // Big brand : 100 products, 5 vegan = 5 % ratio (below 0.5) but
    // 5 ≥ minLabelCount=3, so claim should still fire.
    const big: ObfRow[] = []
    for (let i = 0; i < 95; i++) big.push({ brandTags: ['xx:huge'], labelTags: [] })
    for (let i = 0; i < 5; i++) big.push({ brandTags: ['xx:huge'], labelTags: ['en:vegan'] })
    const out = aggregateBrandClaims(big, {
      ratioThreshold: 0.5,
      minProducts: 2,
      minLabelCount: 3,
    })
    const huge = out.get('huge')
    expect(huge?.total).toBe(100)
    expect(huge?.vegan.count).toBe(5)
    expect(huge?.vegan.ratio).toBeLessThan(0.1)
    expect(huge?.vegan.claim).toBe(true)
  })

  test('count rule still respects floor (count below floor)', () => {
    const small: ObfRow[] = [
      { brandTags: ['xx:tiny'], labelTags: ['en:vegan'] },
      { brandTags: ['xx:tiny'], labelTags: [] },
      { brandTags: ['xx:tiny'], labelTags: [] },
    ]
    const out = aggregateBrandClaims(small, {
      ratioThreshold: 0.5,
      minProducts: 2,
      minLabelCount: 3,
    })
    expect(out.get('tiny')?.vegan.claim).toBe(false)
  })
})

describe('mergeObfSourcesIntoExisting', () => {
  test('appends `obf` to a claim that did not have it', () => {
    const merged = mergeObfSourcesIntoExisting(
      { vegan: ['vegan-society'] },
      {
        obfSlug: 'foo',
        total: 5,
        vegan: { count: 5, ratio: 1, claim: true },
        crueltyFree: { count: 0, ratio: 0, claim: false },
        naturalCertified: { count: 0, ratio: 0, claim: false },
      }
    )
    expect(merged.vegan).toEqual(['vegan-society', 'obf'])
  })

  test('does not duplicate `obf` if already present', () => {
    const merged = mergeObfSourcesIntoExisting(
      { cruelty_free: ['peta', 'obf'] },
      {
        obfSlug: 'foo',
        total: 5,
        vegan: { count: 0, ratio: 0, claim: false },
        crueltyFree: { count: 5, ratio: 1, claim: true },
        naturalCertified: { count: 0, ratio: 0, claim: false },
      }
    )
    expect(merged.cruelty_free).toEqual(['peta', 'obf'])
  })

  test('leaves untouched claims that OBF did not assert', () => {
    const existing = { vegan: ['manual'], cruelty_free: ['peta'] }
    const merged = mergeObfSourcesIntoExisting(existing, {
      obfSlug: 'foo',
      total: 3,
      vegan: { count: 0, ratio: 0, claim: false },
      crueltyFree: { count: 0, ratio: 0, claim: false },
      naturalCertified: { count: 3, ratio: 1, claim: true },
    })
    expect(merged.vegan).toEqual(['manual'])
    expect(merged.cruelty_free).toEqual(['peta'])
    expect(merged.natural).toEqual(['obf'])
  })
})

describe('parseObfCsvLine', () => {
  // Stub line with the columns OBF actually places at indices 19 (brands_tags)
  // and 30 (labels_tags). Other columns can be empty.
  function buildLine(brandTags: string, labelTags: string): string {
    const cols = Array(50).fill('')
    cols[19] = brandTags
    cols[30] = labelTags
    return cols.join('\t')
  }

  test('parses brand and label tag arrays', () => {
    const row = parseObfCsvLine(buildLine('xx:foo,xx:bar', 'en:vegan,en:cruelty-free'))
    expect(row).toEqual({
      brandTags: ['xx:foo', 'xx:bar'],
      labelTags: ['en:vegan', 'en:cruelty-free'],
    })
  })

  test('returns null on empty line', () => {
    expect(parseObfCsvLine('')).toBeNull()
  })

  test('returns null when both fields are empty', () => {
    expect(parseObfCsvLine(buildLine('', ''))).toBeNull()
  })

  test('returns null on truncated lines (fewer cols than label index)', () => {
    expect(parseObfCsvLine('a\tb\tc')).toBeNull()
  })
})
