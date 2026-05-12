import { describe, expect, test } from 'bun:test'

import {
  GOLD_SET_FOCUS_TAGS,
  GOLD_SET_SCHEMA_VERSION,
  GoldSetValidationError,
  isGoldSetFocusTag,
  serializeGoldSet,
  validateGoldSet,
} from '../gold-set/fixtures'

describe('isGoldSetFocusTag', () => {
  test('returns true for every entry in GOLD_SET_FOCUS_TAGS', () => {
    for (const tag of GOLD_SET_FOCUS_TAGS) expect(isGoldSetFocusTag(tag)).toBe(true)
  })

  test('returns false for tags outside the focus scope', () => {
    expect(isGoldSetFocusTag('peau-grasse')).toBe(false)
    expect(isGoldSetFocusTag('apaisant')).toBe(false)
    expect(isGoldSetFocusTag('not-a-real-slug')).toBe(false)
  })
})

describe('validateGoldSet', () => {
  const validBase = {
    schemaVersion: GOLD_SET_SCHEMA_VERSION,
    annotations: [
      {
        productSlug: 'foo-serum',
        kind: 'serum',
        category: 'skincare',
        present: ['retinoids'],
        absent: ['vitamin-c'],
        annotatedAt: '2026-05-08',
      },
    ],
  }

  test('accepts a minimal valid file', () => {
    const out = validateGoldSet(validBase, 'test.json')
    expect(out.annotations.length).toBe(1)
    expect(out.annotations[0]!.present).toEqual(['retinoids'])
    expect(out.annotations[0]!.absent).toEqual(['vitamin-c'])
  })

  test('rejects wrong schemaVersion', () => {
    expect(() =>
      validateGoldSet({ ...validBase, schemaVersion: '1999-01-01' }, 'test.json')
    ).toThrow(GoldSetValidationError)
  })

  test('rejects non-object root', () => {
    expect(() => validateGoldSet(null, 'test.json')).toThrow(GoldSetValidationError)
    expect(() => validateGoldSet('hello', 'test.json')).toThrow(GoldSetValidationError)
  })

  test('rejects non-array annotations', () => {
    expect(() => validateGoldSet({ ...validBase, annotations: 'oops' }, 'test.json')).toThrow(
      GoldSetValidationError
    )
  })

  test('rejects duplicate productSlug', () => {
    expect(() =>
      validateGoldSet(
        {
          ...validBase,
          annotations: [
            { ...validBase.annotations[0] },
            { ...validBase.annotations[0], present: [], absent: [] },
          ],
        },
        'test.json'
      )
    ).toThrow(/Duplicate productSlug/)
  })

  test('rejects unknown tag in present', () => {
    expect(() =>
      validateGoldSet(
        {
          ...validBase,
          annotations: [{ ...validBase.annotations[0], present: ['not-a-focus-tag'] }],
        },
        'test.json'
      )
    ).toThrow(/not in GOLD_SET_FOCUS_TAGS/)
  })

  test('rejects same tag in both present and absent', () => {
    expect(() =>
      validateGoldSet(
        {
          ...validBase,
          annotations: [
            {
              ...validBase.annotations[0],
              present: ['retinoids'],
              absent: ['retinoids'],
            },
          ],
        },
        'test.json'
      )
    ).toThrow(/appear in both "present" and "absent"/)
  })

  test('rejects empty productSlug', () => {
    expect(() =>
      validateGoldSet(
        {
          ...validBase,
          annotations: [{ ...validBase.annotations[0], productSlug: '' }],
        },
        'test.json'
      )
    ).toThrow(/Missing or empty "productSlug"/)
  })

  test('preserves optional fields (notes, sampledFor, rulesetVersion)', () => {
    const out = validateGoldSet(
      {
        ...validBase,
        rulesetVersion: 'products-branch@a4934d1f',
        annotations: [
          {
            ...validBase.annotations[0],
            sampledFor: ['retinoids', 'vitamin-c'],
            notes: 'borderline call on past pos 12',
          },
        ],
      },
      'test.json'
    )
    expect(out.rulesetVersion).toBe('products-branch@a4934d1f')
    expect(out.annotations[0]!.sampledFor).toEqual(['retinoids', 'vitamin-c'])
    expect(out.annotations[0]!.notes).toBe('borderline call on past pos 12')
  })
})

describe('serializeGoldSet', () => {
  test('round-trips through validate without loss', () => {
    const original = validateGoldSet(
      {
        schemaVersion: GOLD_SET_SCHEMA_VERSION,
        annotations: [
          {
            productSlug: 'b-product',
            kind: 'serum',
            category: 'skincare',
            present: ['vitamin-c', 'retinoids'],
            absent: [],
            annotatedAt: '2026-05-08',
            sampledFor: ['retinoids'],
            notes: 'mild',
          },
          {
            productSlug: 'a-product',
            kind: 'cleanser',
            category: 'skincare',
            present: [],
            absent: ['aha'],
            annotatedAt: '',
          },
        ],
      },
      'in-memory'
    )
    const serialized = serializeGoldSet(original)
    const reparsed = validateGoldSet(JSON.parse(serialized), 'reparsed')
    expect(reparsed.annotations.length).toBe(2)
    // Sorted by slug → 'a-product' first.
    expect(reparsed.annotations[0]!.productSlug).toBe('a-product')
    expect(reparsed.annotations[1]!.productSlug).toBe('b-product')
    // present sorted alphabetically.
    expect(reparsed.annotations[1]!.present).toEqual(['retinoids', 'vitamin-c'])
  })

  test('omits empty optional fields (rulesetVersion, notes, sampledFor)', () => {
    const file = validateGoldSet(
      {
        schemaVersion: GOLD_SET_SCHEMA_VERSION,
        annotations: [
          {
            productSlug: 'p1',
            kind: 'serum',
            category: 'skincare',
            present: [],
            absent: [],
            annotatedAt: '',
          },
        ],
      },
      'in-memory'
    )
    const serialized = serializeGoldSet(file)
    expect(serialized).not.toContain('"rulesetVersion"')
    expect(serialized).not.toContain('"notes"')
    expect(serialized).not.toContain('"sampledFor"')
  })

  test('produces deterministic output for stable diffs', () => {
    const a = validateGoldSet(
      {
        schemaVersion: GOLD_SET_SCHEMA_VERSION,
        annotations: [
          {
            productSlug: 'p1',
            kind: 'serum',
            category: 'skincare',
            present: ['vitamin-c', 'retinoids'],
            absent: [],
            annotatedAt: '2026-05-08',
          },
        ],
      },
      'in-memory'
    )
    expect(serializeGoldSet(a)).toBe(serializeGoldSet(a))
  })
})
