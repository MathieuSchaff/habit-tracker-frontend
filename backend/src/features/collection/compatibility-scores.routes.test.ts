import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import { testDb } from '../../tests/db.test.config'
import { setupDbTests } from '../../tests/db-setup'
import { expectRequiresAuth } from '../../tests/helpers/authz-matrix'
import {
  createTestEnv,
  signupAndGetToken,
  type TestClient,
  withAuth,
} from '../../tests/helpers/createTestClient'
import { createProduct } from '../products/service'

type TestApp = Awaited<ReturnType<typeof createTestEnv>>['app']

setupDbTests()

const SOME_UUID = '00000000-0000-0000-0000-000000000000'

describe('POST /collection/compatibility-scores', () => {
  let app: TestApp
  let client: TestClient

  beforeEach(async () => {
    ;({ app, client } = await createTestEnv())
  })

  expectRequiresAuth(() => app, {
    method: 'POST',
    path: '/api/collection/compatibility-scores',
    body: { productIds: [SOME_UUID] },
  })

  it('rejects an empty productIds list', async () => {
    const { token } = await signupAndGetToken(client, 'compat-empty@test.local', 'Azerty123!seed')

    const res = await client.collection['compatibility-scores'].$post(
      { json: { productIds: [] } },
      withAuth(token)
    )

    expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  it('returns a score map keyed by productId (null without signal)', async () => {
    const { token, userId } = await signupAndGetToken(
      client,
      'compat-ok@test.local',
      'Azerty123!seed'
    )
    const product = await createProduct(
      userId,
      'admin',
      {
        name: 'Compat Cream',
        brand: 'Brand',
        kind: 'moisturizer',
        unit: 'tube',
        category: 'skincare',
      },
      testDb
    )

    const res = await client.collection['compatibility-scores'].$post(
      { json: { productIds: [product.id] } },
      withAuth(token)
    )

    expect(res.status as number).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error('expected success body')
    expect(body.data.scores).toHaveProperty(product.id)
    expect(body.data.scores[product.id]).toBeNull()
  })
})
