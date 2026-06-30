import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import { testDb } from '../../../tests/db.test.config'
import { setupDbTests } from '../../../tests/db-setup'
import { createTestClient, type TestClient } from '../../../tests/helpers/createTestClient'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { createProduct } from '../../products/service'

setupDbTests()

async function seedProduct(inci: string | null) {
  const user = await createTestUser()
  return createProduct(
    user.id,
    'admin',
    {
      name: inci ? 'Sérum inci' : 'Sérum no inci',
      brand: 'Brand',
      kind: 'serum',
      unit: 'pump',
      category: 'skincare',
      inci: inci ?? undefined,
    },
    testDb
  )
}

describe('GET /products/:slug/dermo-score', () => {
  let client: TestClient

  beforeEach(async () => {
    client = await createTestClient()
  })

  it('returns 200 with an assessment when the product has INCI', async () => {
    const product = await seedProduct('Aqua, Glycerin, Niacinamide, Parfum')

    const res = await client.products[':slug']['dermo-score'].$get({
      param: { slug: product.slug },
    })

    expect(res.status as number).toBe(HTTP_STATUS.OK)
  })

  // inci_missing is a missing resource, not malformed input — must be 404, not 400.
  it('returns 404 with inci_missing when the product has no INCI', async () => {
    const product = await seedProduct(null)

    const res = await client.products[':slug']['dermo-score'].$get({
      param: { slug: product.slug },
    })

    expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
    const body = await res.json()
    if (body.success) throw new Error('expected failure body')
    expect(body.error).toBe('inci_missing')
  })

  it('returns 404 for an unknown slug', async () => {
    const res = await client.products[':slug']['dermo-score'].$get({
      param: { slug: 'does-not-exist' },
    })

    expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
  })
})
