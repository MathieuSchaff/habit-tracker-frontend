import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'
import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import {
  authDelete,
  authGet,
  authPatch,
  authPost,
  setupAndLogin,
} from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

const PRODUCT_A = {
  name: 'Sérum A',
  brand: 'Acme',
  category: 'skincare',
  kind: 'serum',
  unit: 'bottle',
}
const PRODUCT_B = {
  name: 'Sérum B',
  brand: 'Acme',
  category: 'skincare',
  kind: 'serum',
  unit: 'bottle',
}

describe('Product Comparison Routes', () => {
  let app: Hono<AppEnv>
  beforeEach(async () => {
    app = await createTestApp()
  })

  it('POST creates a comparison', async () => {
    const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
    const a = await authPost(app, '/products', token, PRODUCT_A).then((r) => r.json())
    const b = await authPost(app, '/products', token, PRODUCT_B).then((r) => r.json())

    const res = await authPost(app, '/product-comparisons', token, {
      name: 'Sérums',
      productIds: [a.data.id, b.data.id],
    })
    expect(res.status).toBe(HTTP_STATUS.CREATED)
  })

  it('POST rejects 1 product (too few)', async () => {
    const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
    const a = await authPost(app, '/products', token, PRODUCT_A).then((r) => r.json())

    const res = await authPost(app, '/product-comparisons', token, {
      productIds: [a.data.id],
    })
    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  it('GET /:id returns enriched comparison', async () => {
    const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
    const a = await authPost(app, '/products', token, PRODUCT_A).then((r) => r.json())
    const b = await authPost(app, '/products', token, PRODUCT_B).then((r) => r.json())
    const created = await authPost(app, '/product-comparisons', token, {
      productIds: [a.data.id, b.data.id],
    }).then((r) => r.json())

    const res = await authGet(app, `/product-comparisons/${created.data.id}`, token)
    expect(res.status).toBe(HTTP_STATUS.OK)
    const data = await res.json()
    expect(data.data.products.length).toBe(2)
  })

  it('PATCH renames a comparison', async () => {
    const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
    const a = await authPost(app, '/products', token, PRODUCT_A).then((r) => r.json())
    const b = await authPost(app, '/products', token, PRODUCT_B).then((r) => r.json())
    const created = await authPost(app, '/product-comparisons', token, {
      productIds: [a.data.id, b.data.id],
    }).then((r) => r.json())

    const res = await authPatch(app, `/product-comparisons/${created.data.id}`, token, {
      name: 'Renamed',
    })
    expect(res.status).toBe(HTTP_STATUS.OK)
  })

  it('DELETE removes a comparison', async () => {
    const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
    const a = await authPost(app, '/products', token, PRODUCT_A).then((r) => r.json())
    const b = await authPost(app, '/products', token, PRODUCT_B).then((r) => r.json())
    const created = await authPost(app, '/product-comparisons', token, {
      productIds: [a.data.id, b.data.id],
    }).then((r) => r.json())

    const res = await authDelete(app, `/product-comparisons/${created.data.id}`, token)
    expect(res.status).toBe(204)
  })

  it('GET requires auth (401 anon)', async () => {
    const res = await app.request('/product-comparisons', { method: 'GET' })
    expect(res.status).toBe(401)
  })
})
