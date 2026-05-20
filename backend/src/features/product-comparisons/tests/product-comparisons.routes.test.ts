import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { createTestEnv, type TestClient, withAuth } from '../../../tests/helpers/createTestClient'
import { setupAndLogin } from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

type ProductBody = {
  name: string
  brand: string
  category: 'skincare'
  kind: 'serum'
  unit: 'bottle'
}
const PRODUCT_A: ProductBody = {
  name: 'Sérum A',
  brand: 'Acme',
  category: 'skincare',
  kind: 'serum',
  unit: 'bottle',
}
const PRODUCT_B: ProductBody = {
  name: 'Sérum B',
  brand: 'Acme',
  category: 'skincare',
  kind: 'serum',
  unit: 'bottle',
}

async function createProduct(client: TestClient, token: string, body: ProductBody) {
  const res = await client.products.$post({ json: body }, withAuth(token))
  const data = await res.json()
  if (!data.success) throw new Error('product creation failed')
  return data.data
}

describe('Product Comparison Routes', () => {
  let app: Hono<AppEnv>
  let client: TestClient
  beforeEach(async () => {
    const env = await createTestEnv()
    app = env.app
    client = env.client
  })

  it('POST creates a comparison', async () => {
    const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
    const a = await createProduct(client, token, PRODUCT_A)
    const b = await createProduct(client, token, PRODUCT_B)

    const res = await client['product-comparisons'].$post(
      { json: { name: 'Sérums', productIds: [a.id, b.id] } },
      withAuth(token)
    )
    expect(res.status).toBe(HTTP_STATUS.CREATED)
  })

  it('POST rejects 1 product (too few)', async () => {
    const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
    const a = await createProduct(client, token, PRODUCT_A)

    // Single product fails the zod min(2) → 400 from validator middleware.
    const res = await app.request('/product-comparisons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productIds: [a.id] }),
    })
    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  it('GET /:id returns enriched comparison', async () => {
    const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
    const a = await createProduct(client, token, PRODUCT_A)
    const b = await createProduct(client, token, PRODUCT_B)
    const createdRes = await client['product-comparisons'].$post(
      { json: { productIds: [a.id, b.id] } },
      withAuth(token)
    )
    const createdData = await createdRes.json()
    if (!createdData.success) throw new Error('comparison creation failed')

    const res = await client['product-comparisons'][':id'].$get(
      { param: { id: createdData.data.id } },
      withAuth(token)
    )
    expect(res.status).toBe(HTTP_STATUS.OK)
    const data = await res.json()
    if (!data.success) throw new Error('expected ok')
    expect(data.data.products.length).toBe(2)
  })

  it('PATCH renames a comparison', async () => {
    const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
    const a = await createProduct(client, token, PRODUCT_A)
    const b = await createProduct(client, token, PRODUCT_B)
    const createdRes = await client['product-comparisons'].$post(
      { json: { productIds: [a.id, b.id] } },
      withAuth(token)
    )
    const createdData = await createdRes.json()
    if (!createdData.success) throw new Error('comparison creation failed')

    const res = await client['product-comparisons'][':id'].$patch(
      { json: { name: 'Renamed' }, param: { id: createdData.data.id } },
      withAuth(token)
    )
    expect(res.status).toBe(HTTP_STATUS.OK)
  })

  it('DELETE removes a comparison', async () => {
    const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
    const a = await createProduct(client, token, PRODUCT_A)
    const b = await createProduct(client, token, PRODUCT_B)
    const createdRes = await client['product-comparisons'].$post(
      { json: { productIds: [a.id, b.id] } },
      withAuth(token)
    )
    const createdData = await createdRes.json()
    if (!createdData.success) throw new Error('comparison creation failed')

    const res = await client['product-comparisons'][':id'].$delete(
      { param: { id: createdData.data.id } },
      withAuth(token)
    )
    expect(res.status).toBe(204)
  })

  it('GET requires auth (401 anon)', async () => {
    const res = await app.request('/product-comparisons', { method: 'GET' })
    expect(res.status).toBe(401)
  })
})
