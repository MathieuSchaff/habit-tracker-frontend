import { beforeEach, describe, expect, it } from 'bun:test'

import { testDb } from '../../../tests/db.test.config'
import { cleanDatabase } from '../../../tests/helpers/db-cleaner'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { createProduct } from '../../products/service'
import {
  AUTOTAG_SKIP_EVENT_KIND,
  buildAutoTagSkipLog,
  recordAutoTagSkip,
  writeTagsForProductFailSoft,
} from '../write'

const FAKE_PRODUCT_ID = '00000000-0000-7000-8000-000000000001'

describe('recordAutoTagSkip', () => {
  it('builds the frozen event name + structured context for Grafana logs', () => {
    const err = new Error('analyzeINCI exploded on garbage input')
    const log = buildAutoTagSkipLog(FAKE_PRODUCT_ID, { operation: 'create', userId: 'u1' }, err)

    expect(log).toMatchObject({
      event: AUTOTAG_SKIP_EVENT_KIND,
      productId: FAKE_PRODUCT_ID,
      operation: 'create',
      userId: 'u1',
      cause: 'analyzeINCI exploded on garbage input',
      err,
    })
  })

  it('stringifies non-Error throws', () => {
    const log = buildAutoTagSkipLog(
      FAKE_PRODUCT_ID,
      { operation: 'update', userId: 'u1' },
      'thrown-as-string'
    )

    expect(log).toMatchObject({
      cause: 'thrown-as-string',
      operation: 'update',
      err: undefined,
    })
  })

  it('keeps the fail-soft reporter non-throwing', async () => {
    await expect(
      recordAutoTagSkip(
        testDb,
        FAKE_PRODUCT_ID,
        { operation: 'create', userId: 'u1' },
        new Error('same site')
      )
    ).resolves.toBeUndefined()
  })
})

describe('writeTagsForProductFailSoft', () => {
  beforeEach(async () => {
    await cleanDatabase()
  })

  it('does not throw when the orchestrator succeeds on a healthy product', async () => {
    const user = await createTestUser()
    const product = await createProduct(
      user.id,
      'admin',
      { name: 'Test Serum', brand: 'Lab', kind: 'serum', unit: 'pump', category: 'skincare' },
      testDb
    )

    await expect(
      writeTagsForProductFailSoft(testDb, product.id, {
        operation: 'create',
        userId: user.id,
      })
    ).resolves.toBeUndefined()
  })

  it('does not throw when the product does not exist (writeTagsForProduct returns early)', async () => {
    const user = await createTestUser()
    await expect(
      writeTagsForProductFailSoft(testDb, FAKE_PRODUCT_ID, {
        operation: 'update',
        userId: user.id,
      })
    ).resolves.toBeUndefined()
  })
})
