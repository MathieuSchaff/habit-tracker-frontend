// Safety net for the deterministic kind → tag table (roadmap 1d).
//
// The kindPass wrapper test only proves the pass delegates to detectKindTags;
// both sides read the same table, so dropping ZONE_VISAGE from `cleanser` stays
// green there. These fixtures restate the filter-critical mapping independently,
// so a regression that makes a kind invisible to TYPE_*/ZONE_*/MOMENT_* filters
// fails here.

import { describe, expect, test } from 'bun:test'

import {
  detectKindPrimaryType,
  detectKindTags,
  PRODUCT_KIND_LABELS,
  type ProductKind,
  SKINCARE_PRODUCT_TAG_SLUGS as S,
  type SkincareProductTagSlug,
} from '@habit-tracker/shared'

describe('detectKindTags — pinned fixtures', () => {
  const cases: Array<[ProductKind, SkincareProductTagSlug[]]> = [
    ['serum', [S.TYPE_SERUM, S.STEP_TRAITEMENT, S.ZONE_VISAGE]],
    ['cleanser', [S.TYPE_NETTOYANT, S.STEP_NETTOYAGE_2, S.ZONE_VISAGE]],
    // moment axis (matin)
    ['sunscreen', [S.TYPE_SOLAIRE, S.STEP_PROTECTION_SOLAIRE, S.MOMENT_MATIN, S.ZONE_VISAGE]],
    // moment axis (hebdomadaire)
    ['mask', [S.TYPE_MASQUE, S.MOMENT_HEBDOMADAIRE, S.ZONE_VISAGE]],
    // zone yeux, no step
    ['eye-cream', [S.TYPE_TRAITEMENT, S.ZONE_YEUX]],
    // minimal entry: type only, no zone
    ['deodorant', [S.TYPE_DEODORANT]],
  ]

  for (const [kind, expected] of cases) {
    test(`${kind} → [${expected.join(', ')}]`, () => {
      expect(detectKindTags(kind)).toEqual(expected)
    })
  }
})

describe('kind table invariants', () => {
  const ALL_KINDS = Object.keys(PRODUCT_KIND_LABELS) as ProductKind[]

  test('every mapped kind starts with a type-* slug, exposed as primary', () => {
    for (const kind of ALL_KINDS) {
      const tags = detectKindTags(kind)
      if (tags.length === 0) continue
      expect(tags[0]?.startsWith('type-')).toBe(true)
      expect(detectKindPrimaryType(kind)).toBe(tags[0] ?? null)
    }
  })

  test('primary type is null exactly when the kind is unmapped', () => {
    for (const kind of ALL_KINDS) {
      const mapped = detectKindTags(kind).length > 0
      expect(detectKindPrimaryType(kind) === null).toBe(!mapped)
    }
  })
})

describe('detectKindTags — unmapped kinds', () => {
  test('supplement kind has no type tag (intentional)', () => {
    expect(detectKindTags('gelule')).toEqual([])
    expect(detectKindPrimaryType('gelule')).toBeNull()
  })

  test('unknown kind → empty, no throw', () => {
    expect(detectKindTags('nonexistent' as ProductKind)).toEqual([])
    expect(detectKindPrimaryType('nonexistent' as ProductKind)).toBeNull()
  })
})
