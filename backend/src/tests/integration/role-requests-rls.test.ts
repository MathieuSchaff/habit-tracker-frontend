/**
 * RLS regression for role_requests under the real app_runtime pool (#16b).
 *
 * The route-level tests (features/role-requests/tests) run as the table-owner role `app`
 * (implicit BYPASSRLS), which masks production: APP_DATABASE_URL connects as `app_runtime`
 * (no BYPASSRLS). role_requests carries tenantPolicies only — tenant_isolation
 * (user_id = auth.uid()) + admin_bypass (auth.role() = 'admin'). There is deliberately NO
 * contributor policy: granting the role is account elevation, admin-only. This file proves
 * the owner-only read/write, the admin bypass, and the contributor lockout under prod RLS.
 */
import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
import { SQL } from 'bun'

import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/bun-sql'

import { roleRequests } from '../../db/schema'
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

// Rows visible for a request id under a given app.role / app.user_id via the NO-BYPASSRLS pool.
async function visibleCountAs(role: string, requestId: string, contextUserId: string) {
  return appRuntimeDb.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.user_id', ${contextUserId}, true)`)
    await tx.execute(sql`SELECT set_config('app.role', ${role}, true)`)
    const rows = await tx
      .select({ id: roleRequests.id })
      .from(roleRequests)
      .where(eq(roleRequests.id, requestId))
    return rows.length
  })
}

// Rows actually mutated by a bare cancel UPDATE under a given identity (RLS USING/WITH CHECK).
async function cancelCountAs(role: string, requestId: string, contextUserId: string) {
  return appRuntimeDb.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.user_id', ${contextUserId}, true)`)
    await tx.execute(sql`SELECT set_config('app.role', ${role}, true)`)
    const rows = await tx
      .update(roleRequests)
      .set({ status: 'cancelled' })
      .where(eq(roleRequests.id, requestId))
      .returning({ id: roleRequests.id })
    return rows.length
  })
}

beforeEach(async () => {
  await cleanDatabase()
})

setupDbTests()

describe('role_requests RLS under app_runtime', () => {
  it('owner reads own row; another user and a contributor read none; admin reads all', async () => {
    const owner = await createTestUser('rr-owner@test.local', 'Azerty123!')
    const other = await createTestUser('rr-other@test.local', 'Azerty123!')

    const [req] = await testDb
      .insert(roleRequests)
      .values({ userId: owner.id, motivation: 'Je veux contribuer.' })
      .returning({ id: roleRequests.id })
    if (!req) throw new Error('role request seed failed')

    expect(await visibleCountAs('user', req.id, owner.id)).toBe(1)
    expect(await visibleCountAs('user', req.id, other.id)).toBe(0)
    // contributor has no policy here — elevation review is admin-only
    expect(await visibleCountAs('contributor', req.id, other.id)).toBe(0)
    expect(await visibleCountAs('admin', req.id, other.id)).toBe(1)
  })

  it('owner can cancel own row; a non-owner user cannot; admin can', async () => {
    // One pending row per owner (the partial unique index forbids two pending for one user),
    // so each branch gets its own owner instead of re-seeding the same one.
    const nonOwner = await createTestUser('rr-up-nonowner@test.local', 'Azerty123!')
    const owners = await Promise.all([
      createTestUser('rr-up-o1@test.local', 'Azerty123!'),
      createTestUser('rr-up-o2@test.local', 'Azerty123!'),
      createTestUser('rr-up-o3@test.local', 'Azerty123!'),
    ])
    const seedFor = async (ownerId: string) => {
      const [req] = await testDb
        .insert(roleRequests)
        .values({ userId: ownerId, motivation: 'Je veux contribuer.' })
        .returning({ id: roleRequests.id })
      if (!req) throw new Error('role request seed failed')
      return req.id
    }

    // A non-owner user's UPDATE matches 0 rows (tenant_isolation hides the row).
    expect(await cancelCountAs('user', await seedFor(owners[0].id), nonOwner.id)).toBe(0)
    // The owner's UPDATE matches their own row.
    expect(await cancelCountAs('user', await seedFor(owners[1].id), owners[1].id)).toBe(1)
    // The admin bypasses tenant isolation.
    expect(await cancelCountAs('admin', await seedFor(owners[2].id), nonOwner.id)).toBe(1)
  })
})
