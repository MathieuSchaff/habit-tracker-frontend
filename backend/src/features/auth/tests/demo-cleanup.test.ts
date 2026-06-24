import { afterEach, describe, expect, it } from 'bun:test'

import { users } from '../../../db/schema'
import { testDb } from '../../../tests/db.test.config'
import { setupDbTests } from '../../../tests/db-setup'
import { cleanDatabase } from '../../../tests/helpers/db-cleaner'
import { sweepExpiredDemos } from '../demo-cleanup'

setupDbTests()

afterEach(async () => {
  await cleanDatabase()
})

const insertUser = async (overrides: Partial<typeof users.$inferInsert>): Promise<string> => {
  const [row] = await testDb
    .insert(users)
    .values({
      email: `${crypto.randomUUID()}@demo.local`,
      passwordHash: null,
      isDemo: false,
      ...overrides,
    })
    .returning({ id: users.id })
  if (!row) throw new Error('insert failed')
  return row.id
}

describe('sweepExpiredDemos', () => {
  it('deletes expired demos, keeps fresh demos and real users', async () => {
    const past = new Date(Date.now() - 60_000).toISOString()
    const future = new Date(Date.now() + 60_000).toISOString()

    const expiredId = await insertUser({ isDemo: true, expiresAt: past })
    const freshId = await insertUser({ isDemo: true, expiresAt: future })
    const realId = await insertUser({ isDemo: false, expiresAt: null })

    const count = await sweepExpiredDemos()
    expect(count).toBe(1)

    const remaining = await testDb.select({ id: users.id }).from(users)
    const ids = remaining.map((r) => r.id)
    expect(ids).not.toContain(expiredId)
    expect(ids).toContain(freshId)
    expect(ids).toContain(realId)
  })
})
