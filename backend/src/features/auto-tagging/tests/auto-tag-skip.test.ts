import { beforeEach, describe, expect, it } from 'bun:test'

import { errorGroups, errorOccurrences } from '../../../db/schema'
import { testDb } from '../../../tests/db.test.config'
import { cleanDatabase } from '../../../tests/helpers/db-cleaner'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { createProduct } from '../../products/service'
import { AUTOTAG_SKIP_EVENT_KIND, recordAutoTagSkip, writeTagsForProductFailSoft } from '../write'

const FAKE_PRODUCT_ID = '00000000-0000-7000-8000-000000000001'

describe('recordAutoTagSkip', () => {
  let userId: string

  beforeEach(async () => {
    await cleanDatabase()
    const user = await createTestUser()
    userId = user.id
  })

  it('inserts an errorGroup with the frozen message + structured context', async () => {
    const err = new Error('analyzeINCI exploded on garbage input')
    await recordAutoTagSkip(testDb, FAKE_PRODUCT_ID, { operation: 'create', userId }, err)

    const groups = await testDb.select().from(errorGroups)
    expect(groups).toHaveLength(1)
    const [g] = groups
    expect(g.message).toBe(AUTOTAG_SKIP_EVENT_KIND)
    expect(g.source).toBe('backend')
    expect(g.stack).toBe(err.stack ?? null)
    expect(g.context).toEqual({
      productId: FAKE_PRODUCT_ID,
      operation: 'create',
      cause: 'analyzeINCI exploded on garbage input',
    })

    const occs = await testDb.select().from(errorOccurrences)
    expect(occs).toHaveLength(1)
    expect(occs[0].userId).toBe(userId)
  })

  it('handles non-Error throws (string) — stack null, cause stringified', async () => {
    await recordAutoTagSkip(
      testDb,
      FAKE_PRODUCT_ID,
      { operation: 'update', userId },
      'thrown-as-string'
    )

    const [g] = await testDb.select().from(errorGroups)
    expect(g.stack).toBeNull()
    expect(g.context).toMatchObject({ cause: 'thrown-as-string', operation: 'update' })
  })

  it('dedupes by fingerprint: same throw site twice → one group, two occurrences', async () => {
    const makeErr = () => {
      const e = new Error('same site')
      e.stack = 'Error: same site\n    at writeTagsForProduct (write.ts:99:1)'
      return e
    }
    await recordAutoTagSkip(testDb, FAKE_PRODUCT_ID, { operation: 'create', userId }, makeErr())
    await recordAutoTagSkip(testDb, FAKE_PRODUCT_ID, { operation: 'create', userId }, makeErr())

    const groups = await testDb.select().from(errorGroups)
    expect(groups).toHaveLength(1)
    expect(groups[0].count).toBe(2)

    const occs = await testDb.select().from(errorOccurrences)
    expect(occs).toHaveLength(2)
  })
})

describe('writeTagsForProductFailSoft', () => {
  beforeEach(async () => {
    await cleanDatabase()
  })

  it('records nothing when the orchestrator succeeds on a healthy product', async () => {
    const user = await createTestUser()
    const product = await createProduct(
      user.id,
      'admin',
      { name: 'Test Serum', brand: 'Lab', kind: 'serum', unit: 'pump', category: 'skincare' },
      testDb
    )

    await writeTagsForProductFailSoft(testDb, product.id, {
      operation: 'create',
      userId: user.id,
    })

    const groups = await testDb.select().from(errorGroups)
    expect(groups).toHaveLength(0)
  })

  it('records nothing when the product does not exist (writeTagsForProduct returns early)', async () => {
    const user = await createTestUser()
    await writeTagsForProductFailSoft(testDb, FAKE_PRODUCT_ID, {
      operation: 'update',
      userId: user.id,
    })

    const groups = await testDb.select().from(errorGroups)
    expect(groups).toHaveLength(0)
  })
})
