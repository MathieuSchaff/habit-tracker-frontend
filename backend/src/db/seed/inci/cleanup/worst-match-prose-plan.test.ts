import { describe, expect, it } from 'bun:test'

import { planWorstMatchFix, type WorstMatchFix } from './worst-match-prose-plan'

describe('planWorstMatchFix', () => {
  it('extracts an INCI from mangled HTML without leaving closing-tag residue', () => {
    const fix = {
      slug: 'eve-lom-eye-complex',
      action: 'strip-html',
      marker: /Full Ingredient List:\s*/i,
    } satisfies WorstMatchFix
    const current =
      'lt;p&gt;&lt;span&gt;Full Ingredient List:\u200B&lt;/span&gt;&lt;span&gt;AQUA (WATER), GLYCERIN.&lt;/span&gt;&lt;/p&gt'

    expect(planWorstMatchFix(fix, current)).toEqual({
      kind: 'apply',
      next: 'AQUA (WATER), GLYCERIN',
    })
  })

  it('rejects an empty extraction', () => {
    const fix = {
      slug: 'eve-lom-empty-formula',
      action: 'strip-html',
      marker: /Full Ingredient List:\s*/i,
    } satisfies WorstMatchFix

    expect(
      planWorstMatchFix(fix, '&lt;span&gt;Full Ingredient List:&lt;/span&gt;&lt;/p&gt')
    ).toEqual({ kind: 'reject', reason: 'empty-extraction' })
  })

  it('does nothing when a marker-based fix is already applied', () => {
    const fix = {
      slug: 'eve-lom-clean-formula',
      action: 'strip-html',
      marker: /Full Ingredient List:\s*/i,
    } satisfies WorstMatchFix

    expect(planWorstMatchFix(fix, 'AQUA (WATER), GLYCERIN')).toEqual({
      kind: 'noop',
      reason: 'marker-absent',
    })
  })

  it('repairs the closing-tag residue left by the previous HTML cleanup', () => {
    const fix = {
      slug: 'eve-lom-previous-cleanup',
      action: 'strip-html',
      marker: /Full Ingredient List:\s*/i,
    } satisfies WorstMatchFix

    expect(planWorstMatchFix(fix, 'AQUA (WATER), GLYCERIN. /p')).toEqual({
      kind: 'apply',
      next: 'AQUA (WATER), GLYCERIN',
    })
  })

  it('rejects an extraction that still contains markup residue', () => {
    const fix = {
      slug: 'eve-lom-unknown-entity',
      action: 'strip-html',
      marker: /Full Ingredient List:\s*/i,
    } satisfies WorstMatchFix

    expect(planWorstMatchFix(fix, 'Full Ingredient List: AQUA, GLYCERIN &copy,')).toEqual({
      kind: 'reject',
      reason: 'markup-residue',
    })
  })

  it('rejects a null fix when the source no longer matches the expected prose', () => {
    const fix = {
      slug: 'eve-lom-cleansing-oil',
      action: 'null',
      expected: /How to Use[\s\S]*Apply 1,\s*2 pumps/i,
    } satisfies WorstMatchFix

    expect(planWorstMatchFix(fix, 'AQUA, SQUALANE, TOCOPHEROL')).toEqual({
      kind: 'reject',
      reason: 'unexpected-source',
    })
  })

  it('nulls a source that matches the expected prose', () => {
    const fix = {
      slug: 'eve-lom-cleansing-oil',
      action: 'null',
      expected: /How to Use[\s\S]*Apply 1,\s*2 pumps/i,
    } satisfies WorstMatchFix

    expect(
      planWorstMatchFix(fix, 'How to Use: Apply 1, 2 pumps and massage onto dry skin.')
    ).toEqual({ kind: 'apply', next: null })
  })

  it('rejects a set fix when the source no longer matches its expected preamble', () => {
    const fix = {
      slug: 'eucerin-aquaphor-baume-reparateur',
      action: 'set',
      expected: /^SANS CONSERVATEUR[\s\S]*CERA MICROCRISTALLINA/i,
      value: 'CERA MICROCRISTALLINA, CERESIN, GLYCERIN',
    } satisfies WorstMatchFix

    expect(planWorstMatchFix(fix, 'AQUA, GLYCERIN, PANTHENOL')).toEqual({
      kind: 'reject',
      reason: 'unexpected-source',
    })
  })

  it('does not rewrite a set fix that is already applied', () => {
    const value = 'CERA MICROCRISTALLINA, CERESIN, GLYCERIN'
    const fix = {
      slug: 'eucerin-aquaphor-baume-reparateur',
      action: 'set',
      expected: /^SANS CONSERVATEUR/,
      value,
    } satisfies WorstMatchFix

    expect(planWorstMatchFix(fix, value)).toEqual({
      kind: 'noop',
      reason: 'already-applied',
    })
  })

  it('keeps the short INCI after the last ingredients marker', () => {
    const fix = {
      slug: 'mixsoon-melting-collagen-eye-film',
      action: 'strip-after',
      marker: /Ingr[ée]dients?\s*:\s*/i,
    } satisfies WorstMatchFix

    expect(
      planWorstMatchFix(
        fix,
        'Conseils. Ingrédients : Collagen, Hydrolyzed Collagen, Glutathione, Hyaluronic Acid'
      )
    ).toEqual({
      kind: 'apply',
      next: 'Collagen, Hydrolyzed Collagen, Glutathione, Hyaluronic Acid',
    })
  })
})
