import { beforeEach, describe, expect, it } from 'bun:test'

import { analyzeINCI } from 'algo-derm'
import { buildAliasIndex, lookupIngredient, MERGED_EVIDENCE_DB } from 'algo-derm/engine'

import { ingredients } from '../../../db/schema/ingredients/ingredients'
import { testDb } from '../../../tests/db.test.config'
import { cleanDatabase } from '../../../tests/helpers/db-cleaner'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { createProduct } from '../../products/service'
import { upsertDermoProfile } from '../../profile/service'
import { attachIngredientSlugs, computeProductDermoScore, loadAlgoDermProfile } from '../service'

// Canonical key resolved from the same alias index the service joins on, so the
// fixtures stay valid across algo-derm vendor bumps.
const aliasIndex = buildAliasIndex(MERGED_EVIDENCE_DB)
const NIACINAMIDE_KEY = lookupIngredient('niacinamide', aliasIndex)?.inci ?? null
if (!NIACINAMIDE_KEY)
  throw new Error('algo-derm has no entry for niacinamide — check vendor tarball')

let user: { id: string }

beforeEach(async () => {
  await cleanDatabase()
  user = await createTestUser()
})

async function makeProduct(opts: {
  name: string
  brand: string
  inci?: string | null
  kind?: 'serum' | 'cleanser' | 'moisturizer'
}) {
  return createProduct(
    user.id,
    'admin',
    {
      name: opts.name,
      brand: opts.brand,
      kind: opts.kind ?? 'serum',
      unit: 'pump',
      category: 'skincare',
      inci: opts.inci ?? undefined,
    },
    testDb
  )
}

describe('computeProductDermoScore', () => {
  it('returns assessment for product with INCI (anonymous)', async () => {
    const p = await makeProduct({
      name: 'Sérum test',
      brand: 'Brand',
      inci: 'Aqua, Glycerin, Niacinamide, Alcohol Denat, Parfum, Limonene',
    })

    const result = await computeProductDermoScore(p.slug, null, testDb)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok=true')
    const a = result.assessment
    expect(a.overallRisk).toBeGreaterThanOrEqual(0)
    expect(a.overallRisk).toBeLessThanOrEqual(1)
    expect(['low', 'medium', 'high']).toContain(a.rating)
    expect(a.coverage.total).toBe(6)
    // Tie the baseline to algo-derm actually scoring the irritants (Alcohol Denat /
    // Parfum / Limonene), not just ingredient coverage, catches engine regressions.
    expect(a.overallRisk).toBeGreaterThan(0)
    expect(a.productAxisRisk.irritation.risk).toBeGreaterThan(0)
  })

  it('falls back to the anonymous score when the user has no dermo profile', async () => {
    const inci = 'Aqua, Glycerin, Niacinamide, Alcohol Denat, Parfum, Limonene'
    const p = await makeProduct({ name: 'Sérum sans profil', brand: 'Brand', inci })

    const anon = await computeProductDermoScore(p.slug, null, testDb)
    // user (beforeEach) has no user_dermo_profiles row → loadAlgoDermProfile returns
    // undefined, so the personalized path must collapse onto the anonymous result.
    const noProfile = await computeProductDermoScore(p.slug, user.id, testDb)

    if (!anon.ok || !noProfile.ok) throw new Error('expected ok=true')
    expect(noProfile.assessment).toEqual(anon.assessment)
  })

  it('returns inci_missing when product has no INCI', async () => {
    const p = await makeProduct({ name: 'Sérum no inci', brand: 'Brand', inci: null })

    const result = await computeProductDermoScore(p.slug, null, testDb)

    expect(result).toEqual({ ok: false, reason: 'inci_missing' })
  })

  it('returns inci_missing when INCI is whitespace only', async () => {
    const p = await makeProduct({ name: 'Sérum blank', brand: 'Brand', inci: '   ' })

    const result = await computeProductDermoScore(p.slug, null, testDb)

    expect(result).toEqual({ ok: false, reason: 'inci_missing' })
  })

  it('throws product_not_found for unknown slug', async () => {
    await expect(computeProductDermoScore('does-not-exist', null, testDb)).rejects.toMatchObject({
      code: 'product_not_found',
    })
  })

  it('lifts irritation/dryness drivers when user has sensitive skin', async () => {
    const inci = 'Aqua, Glycerin, Alcohol Denat, Parfum, Limonene'
    const p = await makeProduct({ name: 'Sérum alcohol', brand: 'Brand', inci })

    await upsertDermoProfile(testDb, user.id, { skinTypes: ['peau-sensible'] })

    const anon = await computeProductDermoScore(p.slug, null, testDb)
    const sensitive = await computeProductDermoScore(p.slug, user.id, testDb)

    if (!anon.ok || !sensitive.ok) throw new Error('expected ok=true')
    expect(sensitive.assessment.productAxisRisk.irritation.risk).toBeGreaterThan(
      anon.assessment.productAxisRisk.irritation.risk
    )
  })

  it('attaches ingredientSlug when a visible ingredient shares the canonical key', async () => {
    await testDb.insert(ingredients).values({
      createdBy: user.id,
      name: 'Niacinamide',
      slug: 'niacinamide-link-fixture',
      type: 'skincare',
      canonicalKey: NIACINAMIDE_KEY,
    })
    const p = await makeProduct({
      name: 'Sérum lié',
      brand: 'Brand',
      inci: 'Aqua, Niacinamide, Alcohol Denat, Parfum, Limonene',
    })

    const result = await computeProductDermoScore(p.slug, null, testDb)

    if (!result.ok) throw new Error('expected ok=true')
    const { topDrivers, topBenefitDrivers } = result.assessment.explanation
    const all = [...topDrivers, ...topBenefitDrivers]
    expect(all.length).toBeGreaterThan(0)
    for (const d of all) expect(d).toHaveProperty('ingredientSlug')

    const nia = all.find((d) => d.inci === NIACINAMIDE_KEY)
    expect(nia).toBeDefined()
    expect(nia?.ingredientSlug).toBe('niacinamide-link-fixture')
    // No fixture exists for the other drivers: plain text, never a guessed link.
    expect(
      all.filter((d) => d.inci !== NIACINAMIDE_KEY).every((d) => d.ingredientSlug === null)
    ).toBe(true)
  })

  it('never links a hidden ingredient', async () => {
    await testDb.insert(ingredients).values({
      createdBy: user.id,
      name: 'Niacinamide',
      slug: 'niacinamide-hidden-fixture',
      type: 'skincare',
      canonicalKey: NIACINAMIDE_KEY,
      moderationStatus: 'hidden',
    })
    const p = await makeProduct({
      name: 'Sérum caché',
      brand: 'Brand',
      inci: 'Aqua, Niacinamide, Alcohol Denat',
    })

    const result = await computeProductDermoScore(p.slug, null, testDb)

    if (!result.ok) throw new Error('expected ok=true')
    const all = [
      ...result.assessment.explanation.topDrivers,
      ...result.assessment.explanation.topBenefitDrivers,
    ]
    const nia = all.find((d) => d.inci === NIACINAMIDE_KEY)
    expect(nia).toBeDefined()
    expect(nia?.ingredientSlug).toBeNull()
  })

  it('prefers the skincare row when shadow rows share the canonical key', async () => {
    // Mirrors the real Glycerin case: -hair and -dental shadows with the SAME
    // name, where only the type can break the tie for a skincare product.
    await testDb.insert(ingredients).values([
      {
        createdBy: user.id,
        name: 'Niacinamide',
        slug: 'niacinamide-dental-fixture',
        type: 'dental',
        canonicalKey: NIACINAMIDE_KEY,
      },
      {
        createdBy: user.id,
        name: 'Niacinamide',
        slug: 'niacinamide-hair-fixture',
        type: 'haircare',
        canonicalKey: NIACINAMIDE_KEY,
      },
      {
        createdBy: user.id,
        name: 'Niacinamide',
        slug: 'niacinamide-skin-fixture',
        type: 'skincare',
        canonicalKey: NIACINAMIDE_KEY,
      },
    ])
    const p = await makeProduct({
      name: 'Sérum tie-break',
      brand: 'Brand',
      inci: 'Aqua, Niacinamide, Alcohol Denat',
    })

    const result = await computeProductDermoScore(p.slug, null, testDb)

    if (!result.ok) throw new Error('expected ok=true')
    const all = [
      ...result.assessment.explanation.topDrivers,
      ...result.assessment.explanation.topBenefitDrivers,
    ]
    expect(all.find((d) => d.inci === NIACINAMIDE_KEY)?.ingredientSlug).toBe(
      'niacinamide-skin-fixture'
    )
  })

  it('never links an interaction driver even if it carries a matching inci', async () => {
    await testDb.insert(ingredients).values({
      createdBy: user.id,
      name: 'Niacinamide',
      slug: 'niacinamide-guard-fixture',
      type: 'skincare',
      canonicalKey: NIACINAMIDE_KEY,
    })
    // Today's engine never sets .inci on interaction drivers; forge one to pin
    // the guard against a future rule or vendor bump that does.
    const assessment = analyzeINCI('Aqua, Niacinamide', {})
    assessment.explanation.topDrivers.push({
      label: 'alcohol+fragrance',
      inci: NIACINAMIDE_KEY,
      source: 'interaction',
      axes: ['irritation'],
      contribution: 0.1,
    })

    const linked = await attachIngredientSlugs(assessment, 'skincare', testDb)

    const interaction = linked.explanation.topDrivers.find((d) => d.source === 'interaction')
    expect(interaction).toBeDefined()
    expect(interaction?.ingredientSlug).toBeNull()
    // Same key resolves fine when the driver is ingredient-backed.
    const all = [...linked.explanation.topDrivers, ...linked.explanation.topBenefitDrivers]
    expect(all.some((d) => d.ingredientSlug === 'niacinamide-guard-fixture')).toBe(true)
  })

  it('breaks a same-type tie deterministically by slug', async () => {
    // Insert z before a so raw DB order cannot mask a broken comparator.
    await testDb.insert(ingredients).values([
      {
        createdBy: user.id,
        name: 'Niacinamide',
        slug: 'niacinamide-z-fixture',
        type: 'skincare',
        canonicalKey: NIACINAMIDE_KEY,
      },
      {
        createdBy: user.id,
        name: 'Niacinamide',
        slug: 'niacinamide-a-fixture',
        type: 'skincare',
        canonicalKey: NIACINAMIDE_KEY,
      },
    ])

    const linked = await attachIngredientSlugs(
      analyzeINCI('Aqua, Niacinamide', {}),
      'skincare',
      testDb
    )

    const all = [...linked.explanation.topDrivers, ...linked.explanation.topBenefitDrivers]
    expect(all.find((d) => d.inci === NIACINAMIDE_KEY)?.ingredientSlug).toBe(
      'niacinamide-a-fixture'
    )
  })
})

describe('loadAlgoDermProfile', () => {
  it('returns undefined when the user has no dermo profile row', async () => {
    expect(await loadAlgoDermProfile(user.id, testDb)).toBeUndefined()
  })

  it('maps a sensitive skin type to sensitiveSkin', async () => {
    await upsertDermoProfile(testDb, user.id, { skinTypes: ['peau-sensible'] })

    expect(await loadAlgoDermProfile(user.id, testDb)).toEqual({
      sensitiveSkin: true,
      acneProne: false,
      rosacea: false,
      pregnant: false,
    })
  })

  it('maps an acne concern to acneProne', async () => {
    await upsertDermoProfile(testDb, user.id, { skinConcerns: ['anti-acne'] })

    const profile = await loadAlgoDermProfile(user.id, testDb)
    expect(profile?.acneProne).toBe(true)
    expect(profile?.rosacea).toBe(false)
  })

  it('maps a rosacea concern to rosacea', async () => {
    await upsertDermoProfile(testDb, user.id, { skinConcerns: ['rosacee'] })

    const profile = await loadAlgoDermProfile(user.id, testDb)
    expect(profile?.rosacea).toBe(true)
    expect(profile?.acneProne).toBe(false)
  })

  // pregnant has no column/UI yet; the mapper must keep hardcoding false (not undefined).
  it('always reports pregnant=false', async () => {
    await upsertDermoProfile(testDb, user.id, {
      skinTypes: ['peau-sensible'],
      skinConcerns: ['rosacee', 'anti-acne'],
    })

    expect((await loadAlgoDermProfile(user.id, testDb))?.pregnant).toBe(false)
  })
})
