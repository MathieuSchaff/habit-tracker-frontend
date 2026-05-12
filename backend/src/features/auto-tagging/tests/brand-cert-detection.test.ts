import { describe, expect, test } from 'bun:test'

import { SKINCARE_PRODUCT_TAG_SLUGS } from '@habit-tracker/shared'

import type { BrandCertification } from '../../../db/schema/products/brand-certifications'
import { normalizeBrand } from '../../../db/schema/products/brand-certifications'
import { detectBrandLevelLabels } from '../passes/brand-cert-detection'

const S = SKINCARE_PRODUCT_TAG_SLUGS

const SAMPLES: BrandCertification[] = [
  {
    brandNormalized: 'cosrx',
    brandDisplay: 'COSRX',
    isVegan: false,
    isCrueltyFree: true,
    isNaturalCertified: false,
    sources: { cruelty_free: ['peta'] },
    notes: null,
    updatedAt: '2026-05-09T00:00:00Z',
  },
  {
    brandNormalized: 'patyka',
    brandDisplay: 'Patyka',
    isVegan: false,
    isCrueltyFree: true,
    isNaturalCertified: true,
    sources: { cruelty_free: ['peta'], natural: ['cosmos', 'ecocert'] },
    notes: null,
    updatedAt: '2026-05-09T00:00:00Z',
  },
  {
    brandNormalized: 'caudalie',
    brandDisplay: 'Caudalie',
    isVegan: true,
    isCrueltyFree: true,
    isNaturalCertified: false,
    sources: { vegan: ['vegan-society'], cruelty_free: ['peta'] },
    notes: null,
    updatedAt: '2026-05-09T00:00:00Z',
  },
]

const MAP = new Map(SAMPLES.map((c) => [c.brandNormalized, c]))

describe('detectBrandLevelLabels', () => {
  test('exact lowercase brand match → cruelty-free emitted', () => {
    expect(detectBrandLevelLabels('cosrx', MAP)).toEqual([S.CRUELTY_FREE])
  })

  test('mixed case brand normalizes correctly', () => {
    expect(detectBrandLevelLabels('COSRX', MAP)).toEqual([S.CRUELTY_FREE])
  })

  test('whitespace + casing tolerated', () => {
    expect(detectBrandLevelLabels('  PaTyKa  ', MAP)).toEqual([S.CRUELTY_FREE, S.BIO_NATUREL])
  })

  test('vegan + cruelty-free both fire when brand-level claim is set', () => {
    expect(detectBrandLevelLabels('Caudalie', MAP)).toEqual([S.VEGAN, S.CRUELTY_FREE])
  })

  test('unknown brand → no tags', () => {
    expect(detectBrandLevelLabels('Some Random Brand', MAP)).toEqual([])
  })

  test('empty / null brand → no tags', () => {
    expect(detectBrandLevelLabels(null, MAP)).toEqual([])
    expect(detectBrandLevelLabels(undefined, MAP)).toEqual([])
    expect(detectBrandLevelLabels('', MAP)).toEqual([])
  })

  test('absent map → no tags (orchestrator pass becomes no-op)', () => {
    expect(detectBrandLevelLabels('cosrx', undefined)).toEqual([])
  })

  test('normalizeBrand collapses internal whitespace', () => {
    expect(normalizeBrand('Some  By  Mi')).toBe('some by mi')
    expect(normalizeBrand('La Roche-Posay')).toBe('la roche-posay')
  })
})
