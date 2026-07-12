// Contract tests for the formula pass family (ADR-0001 declarative table).
//
// The family used to be N hand-written `Pass` objects, each with a tautological
// shape test (`pass.run ≡ asProposals(detector(...))`). After the collapse it is
// one `FORMULA_PASSES` table. Detector behaviour is owned by `tests/formula.test.ts`
// (INCI in → slugs out) and orchestration by the parity test; these tests guard
// only what the table itself owns: the shared metadata stamp, table integrity,
// and that the non-INCI binds route the right `PassContext` field.

import { describe, expect, test } from 'bun:test'

import {
  type ProductKind,
  type ProductTexture,
  SKINCARE_PRODUCT_TAG_SLUGS as S,
  type SkincareProductTagSlug,
} from '@aurore/shared'

import { buildPassContext } from '../lib/build-pass-context'
import type { PassContext } from '../lib/pass-types'
import { FORMULA_PASSES } from '../passes/formula/formula-passes'

function makeCtx(input: {
  inci?: string | null
  kind: ProductKind
  category: string
  texture?: ProductTexture | null
  name?: string | null
  description?: string | null
}): PassContext {
  return buildPassContext(
    {
      inci: input.inci ?? null,
      kind: input.kind,
      category: input.category,
      texture: input.texture,
      name: input.name,
      description: input.description,
    },
    {}
  )
}

function runPass(name: string, ctx: PassContext): readonly SkincareProductTagSlug[] {
  const pass = FORMULA_PASSES.find((p) => p.name === name)
  if (!pass) throw new Error(`no formula pass named ${name}`)
  return pass.run(ctx, []).map((p) => p.tagSlug)
}

// Fixtures rich enough to make several formula detectors fire.
const richMoisturizer = makeCtx({
  inci: 'Aqua, Glycerin, Squalane, Dimethicone, Tocopherol, Panthenol',
  kind: 'moisturizer',
  category: 'skincare',
})
const sunscreen = makeCtx({
  inci: 'Aqua, Octocrylene, Avobenzone, Homosalate, Glycerin, Tocopherol',
  kind: 'sunscreen',
  category: 'solaire',
})
const cleanser = makeCtx({
  inci: 'Caprylic Capric Triglyceride, Olea Europaea Fruit Oil, Aqua, Glycerin',
  kind: 'cleanser',
  category: 'skincare',
})
const eyeCream = makeCtx({
  inci: 'Aqua, Caffeine, Glycerin, Niacinamide, Tocopherol',
  kind: 'eye-cream',
  category: 'skincare',
})
const baumeNamed = makeCtx({
  inci: 'Cera Alba, Butyrospermum Parkii Butter, Tocopherol',
  kind: 'moisturizer',
  category: 'skincare',
  texture: null,
  name: 'Baume Réparateur',
})
const stickNamed = makeCtx({
  inci: 'Cera Alba, Tocopherol',
  kind: 'lip-care',
  category: 'skincare',
  texture: null,
  name: 'Lip Stick',
})
const fieldTexture = makeCtx({ kind: 'moisturizer', category: 'skincare', texture: 'gel' })
const eczemaNamed = makeCtx({
  inci: 'Aqua, Glycerin, Butyrospermum Parkii Butter',
  kind: 'moisturizer',
  category: 'skincare',
  name: 'Baume Émollient Peau Atopique',
})
const absenceText = makeCtx({
  kind: 'serum',
  category: 'skincare',
  name: 'Sérum Sans Parfum',
  description: 'Formulé sans alcool, sans parfum, testé sous contrôle dermatologique',
})

const FIXTURES = [
  richMoisturizer,
  sunscreen,
  cleanser,
  eyeCream,
  baumeNamed,
  stickNamed,
  fieldTexture,
  eczemaNamed,
  absenceText,
]

describe('formula pass table contract', () => {
  test('entries are uniquely named with a formula: prefix', () => {
    const names = FORMULA_PASSES.map((p) => p.name)
    expect(new Set(names).size).toBe(names.length)
    for (const n of names) expect(n.startsWith('formula:')).toBe(true)
  })

  // Tripwire: a dropped/duplicated entry shifts the dedup order the parity test
  // pins. Bump this deliberately when adding a formula pass.
  test('the family has 37 passes', () => {
    expect(FORMULA_PASSES.length).toBe(37)
  })

  test('formulaPass stamps source=formula, relevance=secondary on every proposal', () => {
    for (const ctx of FIXTURES) {
      for (const pass of FORMULA_PASSES) {
        for (const p of pass.run(ctx, [])) {
          expect(p.source).toBe('formula')
          expect(p.relevance).toBe('secondary')
        }
      }
    }
  })

  test('the table is live — fires non-empty across the rich fixtures', () => {
    const total = FIXTURES.flatMap((ctx) => FORMULA_PASSES.flatMap((p) => p.run(ctx, [])))
    expect(total.length).toBeGreaterThan(0)
  })
})

// The binds for INCI-driven passes are exercised by formula.test.ts + parity.
// These cover the passes that read a non-INCI field, where a wrong-field bind
// would be the silent-arg failure this collapse set out to remove.
describe('formula pass field binds', () => {
  test('texture-from-field reads ctx.texture', () => {
    expect(runPass('formula:texture-from-field', fieldTexture).length).toBeGreaterThan(0)
  })

  test('protection reads ctx.kind (sunscreen → protection)', () => {
    expect(runPass('formula:protection', sunscreen)).toContain(S.PROTECTION)
  })

  test('texture-baume-name reads the product name', () => {
    expect(runPass('formula:texture-baume-name', baumeNamed)).toContain(S.TEXTURE_BAUME)
  })

  test('texture-stick-name reads the product name', () => {
    expect(runPass('formula:texture-stick-name', stickNamed)).toContain(S.TEXTURE_STICK)
  })

  test('eczema-atopie-name reads the product name', () => {
    expect(runPass('formula:eczema-atopie-name', eczemaNamed)).toContain(S.ECZEMA_ATOPIE)
  })

  test('absence-claims reads name/description text', () => {
    expect(runPass('formula:absence-claims-text', absenceText)).toContain(S.SANS_PARFUM)
  })

  // Regression: this row used to be a plain formulaPass, so audits showed no trigger.
  test('rougeurs-vasculaires-name emits name-positioning evidence', () => {
    const ctx = makeCtx({
      kind: 'moisturizer',
      category: 'skincare',
      name: 'Crème Anti-Rougeurs',
    })
    const pass = FORMULA_PASSES.find((p) => p.name === 'formula:rougeurs-vasculaires-name')
    if (!pass) throw new Error('missing rougeurs-vasculaires-name pass')
    const proposals = pass.run(ctx, [])
    expect(proposals.map((p) => p.tagSlug)).toContain(S.ROUGEURS_VASCULAIRES)
    expect(proposals[0]?.evidence).toEqual({
      matchedToken: 'Rougeur',
      sourceField: 'name',
      rule: 'name-positioning',
    })
  })
})
