/**
 * DB backstop regression (migration 0091): the application pool (app_runtime) may
 * never write role='admin'. This is the fail-closed layer behind the route guard +
 * shared validator — if the validator on the role-write path is ever relaxed, the DB
 * still refuses an admin promotion. Demote->'user' and promote->'contributor' (16b)
 * stay allowed; the table owner (`app`, used by seed/migrations) is exempt.
 *
 * Like user-bans-rls, route tests run as the owner `app` (exempt), so the trigger is
 * only observable under the real app_runtime pool — hence the dedicated connection.
 */
import { afterAll, describe, expect, it } from 'bun:test'
import { SQL } from 'bun'

import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/bun-sql'

import { users } from '../../db/schema'
import { testDb } from '../db.test.config'
import { setupDbTests } from '../db-setup'
import { createTestContributorUser, createTestUser } from '../helpers/test-factories'

const APP_DATABASE_URL = process.env.APP_DATABASE_URL
if (!APP_DATABASE_URL) throw new Error('APP_DATABASE_URL not set')

const appRuntimePool = new SQL(APP_DATABASE_URL)
const appRuntimeDb = drizzle(appRuntimePool, { schema: await import('../../db/schema') })

afterAll(async () => {
  await appRuntimePool.close()
})

function setRoleAs(userId: string, role: 'user' | 'admin' | 'contributor') {
  return appRuntimeDb
    .update(users)
    .set({ role })
    .where(eq(users.id, userId))
    .returning({ id: users.id, role: users.role })
}

async function rejected(run: () => Promise<unknown>): Promise<boolean> {
  try {
    await run()
    return false
  } catch {
    return true
  }
}

setupDbTests()

describe('users role backstop under app_runtime (migration 0091)', () => {
  it('rejects an app_runtime UPDATE promoting a user to admin', async () => {
    const user = await createTestUser('backstop-promote@test.local', 'Azerty123!')
    expect(await rejected(() => setRoleAs(user.id, 'admin'))).toBe(true)
  })

  it('rejects an app_runtime UPDATE promoting a contributor to admin', async () => {
    const modo = await createTestContributorUser('backstop-modo@test.local', 'Azerty123!')
    expect(await rejected(() => setRoleAs(modo.id, 'admin'))).toBe(true)
  })

  it('allows an app_runtime demote of a contributor to user', async () => {
    const modo = await createTestContributorUser('backstop-demote@test.local', 'Azerty123!')
    const rows = await setRoleAs(modo.id, 'user')
    expect(rows[0]?.role).toBe('user')
  })

  it('allows an app_runtime promote of a user to contributor (role-request 16b)', async () => {
    const user = await createTestUser('backstop-contrib@test.local', 'Azerty123!')
    const rows = await setRoleAs(user.id, 'contributor')
    expect(rows[0]?.role).toBe('contributor')
  })

  it('rejects an app_runtime INSERT of an admin user', async () => {
    const threw = await rejected(() =>
      appRuntimeDb.execute(sql`
        INSERT INTO users (email, role) VALUES ('backstop-insert@test.local', 'admin')
      `)
    )
    expect(threw).toBe(true)
  })

  it('lets the table owner set role=admin (seed/migration path stays exempt)', async () => {
    const user = await createTestUser('backstop-owner@test.local', 'Azerty123!')
    await testDb.update(users).set({ role: 'admin' }).where(eq(users.id, user.id))
    const [row] = await testDb.select({ role: users.role }).from(users).where(eq(users.id, user.id))
    expect(row?.role).toBe('admin')
  })
})
