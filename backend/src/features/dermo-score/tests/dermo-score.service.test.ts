import { beforeEach, describe, expect, it } from 'bun:test'

import { testDb } from '../../../tests/db.test.config'
import { cleanDatabase } from '../../../tests/helpers/db-cleaner'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { createProduct } from '../../products/service'
import { upsertDermoProfile } from '../../profile/service'
import { computeProductDermoScore } from '../service'

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
    {
      name: opts.name,
      brand: opts.brand,
      kind: opts.kind ?? 'serum',
      unit: 'pump',
      category: 'skincare',
      inci: opts.inci,
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
})
