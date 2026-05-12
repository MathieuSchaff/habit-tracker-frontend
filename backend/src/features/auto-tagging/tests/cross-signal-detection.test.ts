import { describe, expect, test } from 'bun:test'

import { SKINCARE_PRODUCT_TAG_SLUGS } from '@habit-tracker/shared'

import { analyzeINCI } from 'algo-derm'

import { mapKindToContext } from '../../dermo-score/profile-mapping'
import {
  detectCrossSignalAvoidTags,
  detectCrossSignalTags,
  detectInteractionAvoidTags,
  detectInteractionSecondaryTags,
} from '../passes/cross-signal-detection'

const S = SKINCARE_PRODUCT_TAG_SLUGS

describe('cross-signal-detection', () => {
  test('retinoids on leave-on serum → moment-soir', () => {
    const tags = detectCrossSignalTags([S.RETINOIDS], 'serum')
    expect(tags).toContain(S.MOMENT_SOIR)
  })

  test('AHA in cleanser (rinse-off) → no moment-soir', () => {
    const tags = detectCrossSignalTags([S.AHA], 'cleanser')
    expect(tags).not.toContain(S.MOMENT_SOIR)
  })

  test('vitamin C on serum → moment-matin', () => {
    const tags = detectCrossSignalTags([S.VITAMIN_C], 'serum')
    expect(tags).toContain(S.MOMENT_MATIN)
  })

  test('X2 vitamin C on sunscreen → moment-matin (SPF + vit-C combo)', () => {
    const tags = detectCrossSignalTags([S.VITAMIN_C], 'sunscreen')
    expect(tags).toContain(S.MOMENT_MATIN)
  })

  test('X2 vitamin C on cleanser (rinse-off, not sunscreen) → no moment-matin', () => {
    const tags = detectCrossSignalTags([S.VITAMIN_C], 'cleanser')
    expect(tags).not.toContain(S.MOMENT_MATIN)
  })

  test('AHA in mask → moment-hebdomadaire', () => {
    const tags = detectCrossSignalTags([S.AHA], 'mask')
    expect(tags).toContain(S.MOMENT_HEBDOMADAIRE)
  })

  test('hydroquinone in leave-on serum → moment-soir', () => {
    const tags = detectCrossSignalTags([], 'serum', 'Aqua, Hydroquinone, Glycerin')
    expect(tags).toContain(S.MOMENT_SOIR)
  })

  test('hydroquinone in rinse-off cleanser → no moment-soir', () => {
    const tags = detectCrossSignalTags([], 'cleanser', 'Aqua, Hydroquinone, Glycerin')
    expect(tags).not.toContain(S.MOMENT_SOIR)
  })

  test('no INCI passed → hydroquinone path is skipped', () => {
    const tags = detectCrossSignalTags([], 'serum')
    expect(tags).toEqual([])
  })

  test('null INCI is tolerated', () => {
    const tags = detectCrossSignalTags([], 'serum', null)
    expect(tags).toEqual([])
  })

  test('C5 retinoids on body-lotion → anti-age', () => {
    const tags = detectCrossSignalTags([S.RETINOIDS], 'body-lotion')
    expect(tags).toContain(S.ANTI_AGE)
  })

  test('C5 retinoids on body-oil → anti-age + moment-soir', () => {
    const tags = detectCrossSignalTags([S.RETINOIDS], 'body-oil')
    expect(tags).toContain(S.ANTI_AGE)
    expect(tags).toContain(S.MOMENT_SOIR)
  })

  test('C5 retinoids on hand-cream → anti-age', () => {
    const tags = detectCrossSignalTags([S.RETINOIDS], 'hand-cream')
    expect(tags).toContain(S.ANTI_AGE)
  })

  test('C5 retinoids on body-wash (rinse-off) → no anti-age', () => {
    const tags = detectCrossSignalTags([S.RETINOIDS], 'body-wash')
    expect(tags).not.toContain(S.ANTI_AGE)
  })

  test('C5 no retinoids on body-lotion → no anti-age', () => {
    const tags = detectCrossSignalTags([S.HYALURONIC_ACID], 'body-lotion')
    expect(tags).not.toContain(S.ANTI_AGE)
  })
})

describe('cross-signal — moment-crise (T1.9)', () => {
  test('spot-treatment + BHA actif → moment-crise', () => {
    const tags = detectCrossSignalTags([S.BHA], 'spot-treatment')
    expect(tags).toContain(S.MOMENT_CRISE)
  })

  test('spot-treatment + benzoyl peroxide top 5 → moment-crise', () => {
    const tags = detectCrossSignalTags(
      [],
      'spot-treatment',
      'Aqua, Glycerin, Benzoyl Peroxide, Cetyl Alcohol'
    )
    expect(tags).toContain(S.MOMENT_CRISE)
  })

  test('spot-treatment + azelaic acid top 5 → moment-crise', () => {
    const tags = detectCrossSignalTags(
      [],
      'spot-treatment',
      'Aqua, Glycerin, Azelaic Acid, Niacinamide'
    )
    expect(tags).toContain(S.MOMENT_CRISE)
  })

  test('spot-treatment without acute actif → no moment-crise', () => {
    const tags = detectCrossSignalTags([], 'spot-treatment', 'Aqua, Glycerin, Niacinamide')
    expect(tags).not.toContain(S.MOMENT_CRISE)
  })

  test('serum + BHA → no moment-crise (kind gating)', () => {
    const tags = detectCrossSignalTags([S.BHA], 'serum')
    expect(tags).not.toContain(S.MOMENT_CRISE)
  })

  test('benzoyl peroxide past top 5 → not flagged', () => {
    const tags = detectCrossSignalTags(
      [],
      'spot-treatment',
      'Aqua, Glycerin, Niacinamide, Cetyl Alcohol, Tocopherol, Benzoyl Peroxide'
    )
    expect(tags).not.toContain(S.MOMENT_CRISE)
  })
})

describe('detectCrossSignalAvoidTags — X1 stack irritation', () => {
  test('retinoids + AHA leave-on (serum) → peau-sensible avoid', () => {
    const tags = detectCrossSignalAvoidTags([S.RETINOIDS, S.AHA], 'serum')
    expect(tags).toContain(S.PEAU_SENSIBLE)
  })

  test('retinoids + BHA leave-on (moisturizer) → peau-sensible avoid', () => {
    const tags = detectCrossSignalAvoidTags([S.RETINOIDS, S.BHA], 'moisturizer')
    expect(tags).toContain(S.PEAU_SENSIBLE)
  })

  test('retinoids + AHA on rinse-off (cleanser) → no avoid (short contact time)', () => {
    expect(detectCrossSignalAvoidTags([S.RETINOIDS, S.AHA], 'cleanser')).toEqual([])
  })

  test('retinoids alone → no avoid (single actif, not a stack)', () => {
    expect(detectCrossSignalAvoidTags([S.RETINOIDS], 'serum')).toEqual([])
  })

  test('AHA + BHA without retinoids → no avoid (acid stack ≠ retinoid stack scope)', () => {
    expect(detectCrossSignalAvoidTags([S.AHA, S.BHA], 'serum')).toEqual([])
  })

  test('retinoids + PHA (gentle exfoliant) → no avoid', () => {
    expect(detectCrossSignalAvoidTags([S.RETINOIDS, S.PHA], 'serum')).toEqual([])
  })
})

describe('detectInteractionAvoidTags — X3 axis mapping', () => {
  const assess = (inci: string, kind: 'serum' | 'cleanser' | 'moisturizer') =>
    analyzeINCI(inci, { context: mapKindToContext(kind) })

  test('alcohol + parfum leave-on (irritation+allergenicity+dryness) → peau-sensible AND peau-seche', () => {
    const a = assess('Aqua, Alcohol Denat, Parfum, Glycerin', 'serum')
    const tags = detectInteractionAvoidTags(a, 'serum')
    expect(tags).toContain(S.PEAU_SENSIBLE)
    expect(tags).toContain(S.PEAU_SECHE)
  })

  test('acid+alcohol leave-on (irritation+dryness, no allergenicity) → peau-sensible + peau-seche', () => {
    const a = assess('Aqua, Alcohol Denat, Glycolic Acid, Glycerin', 'serum')
    const tags = detectInteractionAvoidTags(a, 'serum')
    expect(tags).toContain(S.PEAU_SENSIBLE)
    expect(tags).toContain(S.PEAU_SECHE)
  })

  test('isothiazolinone leave-on (allergenicity+irritation, no dryness) → peau-sensible only', () => {
    const a = assess('Aqua, Methylisothiazolinone, Glycerin', 'moisturizer')
    const tags = detectInteractionAvoidTags(a, 'moisturizer')
    expect(tags).toContain(S.PEAU_SENSIBLE)
    expect(tags).not.toContain(S.PEAU_SECHE)
  })

  test('mitigation niacinamide+glycerin (negative adj) → no avoid', () => {
    const a = assess('Aqua, Glycerin, Niacinamide', 'serum')
    expect(detectInteractionAvoidTags(a, 'serum')).toEqual([])
  })

  test('rinse-off cleanser → skipped regardless of interactions', () => {
    const a = assess('Aqua, Alcohol Denat, Parfum, Glycerin', 'cleanser')
    expect(detectInteractionAvoidTags(a, 'cleanser')).toEqual([])
  })
})

describe('detectInteractionSecondaryTags — X3 photosensitivity → moment-soir', () => {
  const assess = (inci: string, kind: 'serum' | 'cleanser') =>
    analyzeINCI(inci, { context: mapKindToContext(kind) })

  test('lavender + lemon peel oil leave-on → moment-soir', () => {
    const a = assess('Aqua, Lavandula Angustifolia Oil, Citrus Limon Peel Oil, Glycerin', 'serum')
    expect(detectInteractionSecondaryTags(a, 'serum')).toContain(S.MOMENT_SOIR)
  })

  test('same INCI rinse-off cleanser → no moment-soir (rinse-off gating)', () => {
    const a = assess(
      'Aqua, Lavandula Angustifolia Oil, Citrus Limon Peel Oil, Glycerin',
      'cleanser'
    )
    expect(detectInteractionSecondaryTags(a, 'cleanser')).toEqual([])
  })

  test('alcohol + parfum (no photosensitivity axis) → no moment-soir from interactions', () => {
    const a = assess('Aqua, Alcohol Denat, Parfum, Glycerin', 'serum')
    expect(detectInteractionSecondaryTags(a, 'serum')).toEqual([])
  })
})
