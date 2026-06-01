import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
import { SQL } from 'bun'

import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/bun-sql'

import { suggestedEdits } from '../../db/schema'
import { testDb } from '../db.test.config'
import { setupDbTests } from '../db-setup'
import { cleanDatabase } from '../helpers/db-cleaner'
import { createTestUser } from '../helpers/test-factories'

const APP_DATABASE_URL = process.env.APP_DATABASE_URL
if (!APP_DATABASE_URL) throw new Error('APP_DATABASE_URL not set')

const appRuntimePool = new SQL(APP_DATABASE_URL)
const appRuntimeDb = drizzle(appRuntimePool, {
  schema: await import('../../db/schema'),
})

afterAll(async () => {
  await appRuntimePool.close()
})

beforeEach(async () => {
  await cleanDatabase()
})

setupDbTests()

// Set app.user_id + app.role LOCAL to the tx so auth.uid()/auth.role() see the
// correct identity — mirrors the withRlsContext helper used in production routes.
function withRls<T>(role: string, userId: string, fn: (tx: typeof appRuntimeDb) => Promise<T>) {
  return appRuntimeDb.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.user_id', ${userId}, true)`)
    await tx.execute(sql`SELECT set_config('app.role', ${role}, true)`)
    return fn(tx as unknown as typeof appRuntimeDb)
  })
}

describe('suggested_edits RLS', () => {
  let proposerId: string
  let otherUserId: string

  beforeEach(async () => {
    const proposer = await createTestUser('prop@toto.com', 'Azerty123!')
    const other = await createTestUser('other@toto.com', 'Azerty123!')
    proposerId = proposer.id
    otherUserId = other.id
  })

  it("a proposer reads back their own pending edit but not another user's", async () => {
    // targetId is polymorphic (no FK) — reuse user UUIDs as dummy target IDs.
    await testDb.insert(suggestedEdits).values([
      {
        proposerId,
        targetType: 'product',
        targetId: proposerId,
        field: 'name',
        proposedValue: 'mine',
      },
      {
        proposerId: otherUserId,
        targetType: 'product',
        targetId: otherUserId,
        field: 'name',
        proposedValue: 'theirs',
      },
    ])
    const rows = await withRls('user', proposerId, (tx) => tx.select().from(suggestedEdits))
    expect(rows.length).toBe(1)
    expect(rows[0]?.proposedValue).toBe('mine')
  })

  // moderationPolicies adds contributor SELECT on all rows — validates the key
  // design decision: without it a contributor would see 0 rows from their queue.
  it('a contributor sees the whole queue (moderationPolicies)', async () => {
    await testDb.insert(suggestedEdits).values([
      {
        proposerId,
        targetType: 'product',
        targetId: proposerId,
        field: 'name',
        proposedValue: 'a',
      },
      {
        proposerId: otherUserId,
        targetType: 'product',
        targetId: otherUserId,
        field: 'name',
        proposedValue: 'b',
      },
    ])
    const rows = await withRls('contributor', otherUserId, (tx) => tx.select().from(suggestedEdits))
    expect(rows.length).toBe(2)
  })

  it('a contributor can UPDATE (review) any row', async () => {
    const [edit] = await testDb
      .insert(suggestedEdits)
      .values({
        proposerId,
        targetType: 'product',
        targetId: proposerId,
        field: 'name',
        proposedValue: 'x',
      })
      .returning({ id: suggestedEdits.id })
    if (!edit) throw new Error('seed failed')

    await withRls('contributor', otherUserId, (tx) =>
      tx.update(suggestedEdits).set({ status: 'rejected' }).where(sql`id = ${edit.id}`)
    )

    const [after] = await testDb.select({ status: suggestedEdits.status }).from(suggestedEdits)
    expect(after?.status).toBe('rejected')
  })

  it("a plain user cannot UPDATE another user's edit (0 rows affected)", async () => {
    const [edit] = await testDb
      .insert(suggestedEdits)
      .values({
        proposerId,
        targetType: 'product',
        targetId: proposerId,
        field: 'name',
        proposedValue: 'x',
      })
      .returning({ id: suggestedEdits.id })
    if (!edit) throw new Error('seed failed')

    const res = await withRls('user', otherUserId, (tx) =>
      tx
        .update(suggestedEdits)
        .set({ status: 'rejected' })
        .where(sql`id = ${edit.id}`)
        .returning({ id: suggestedEdits.id })
    )
    // RLS silently filters the row: 0 rows updated, no error.
    expect(res.length).toBe(0)
  })
})
