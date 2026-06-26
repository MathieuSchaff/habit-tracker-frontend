/**
 * RLS regression for user_dermo_profiles_select_discoverable. Route-level tests
 * run on the owner pool (RLS bypassed); production runs as app_runtime, so the
 * policy's boundary is only exercised here, on a second app_runtime pool.
 *
 * Scope note: _select_public already exposes any public profile's dermo row to
 * app_runtime, so this policy adds no read capability on its own — it is
 * forward-proofing/defense-in-depth, and the "opt-in only" narrowing is the
 * ranking service's explicit discoverable filter. What is asserted here is the
 * invariant ADR 0012 promises: discoverable never overrides the master gate.
 */
import { afterAll, describe, expect, it } from 'bun:test'
import { SQL } from 'bun'

import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/bun-sql'

import { profiles, userDermoProfiles } from '../../db/schema/auth/users'
import { testDb } from '../db.test.config'
import { setupDbTests } from '../db-setup'
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

// setupDbTests() already registers a beforeEach(cleanDatabase) — no second one.
setupDbTests()

describe('user_dermo_profiles_select_discoverable RLS — app_runtime', () => {
  it('exposes an opt-in (discoverable + public) dermo row to app_runtime', async () => {
    const peer = await createTestUser('disc-pub@test.local', 'Azerty123!')
    await testDb
      .update(profiles)
      .set({ username: 'disc-pub', profilePublic: true })
      .where(eq(profiles.userId, peer.id))
    await testDb
      .insert(userDermoProfiles)
      .values({ userId: peer.id, skinConcerns: ['rosacee'], discoverable: true })

    const rows = await appRuntimeDb.select().from(userDermoProfiles)
    expect(rows.map((r) => r.userId)).toEqual([peer.id])
  })

  it('hides a discoverable user whose profile is private — master gate beats discoverable', async () => {
    const peer = await createTestUser('disc-priv@test.local', 'Azerty123!')
    await testDb
      .update(profiles)
      .set({ username: 'disc-priv', profilePublic: false })
      .where(eq(profiles.userId, peer.id))
    await testDb
      .insert(userDermoProfiles)
      .values({ userId: peer.id, skinConcerns: ['rosacee'], discoverable: true })

    const rows = await appRuntimeDb.select().from(userDermoProfiles)
    expect(rows).toHaveLength(0)
  })

  it('hides a discoverable public user force-privated by admin', async () => {
    const peer = await createTestUser('disc-forced@test.local', 'Azerty123!')
    await testDb
      .update(profiles)
      .set({ username: 'disc-forced', profilePublic: true, forcedPrivateByAdmin: true })
      .where(eq(profiles.userId, peer.id))
    await testDb
      .insert(userDermoProfiles)
      .values({ userId: peer.id, skinConcerns: ['rosacee'], discoverable: true })

    const rows = await appRuntimeDb.select().from(userDermoProfiles)
    expect(rows).toHaveLength(0)
  })
})
