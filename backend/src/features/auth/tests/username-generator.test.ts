import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'bun:test'

import type { Email, HashedPassword } from '@aurore/shared'

import { profiles } from '../../../db/schema'
import { testDb } from '../../../tests/db.test.config'
import { setupDbTests } from '../../../tests/db-setup'
import { getProfile } from '../../profile'
import { createProfile, createUser } from '../user.utils'
import { generateUniqueUsername } from '../username-generator'

setupDbTests()

const HANDLE_RE = /^[a-z]+-[a-z]+-\d+$/

async function newUser() {
  const email = `gen-${randomUUID()}@example.com` as Email
  const passwordHash = (await Bun.password.hash('Secret123!')) as HashedPassword
  return createUser(testDb, { email, passwordHash })
}

describe('username-generator', () => {
  it('returns a friendly, URL-safe handle under 32 chars', async () => {
    const handle = await generateUniqueUsername(testDb)
    expect(handle).toMatch(HANDLE_RE)
    expect(handle.length).toBeLessThanOrEqual(32)
  })

  it('createProfile assigns a non-null pseudonym', async () => {
    const user = await newUser()
    await createProfile(testDb, user.id)
    const profile = await getProfile(testDb, user.id)
    expect(profile?.username).toMatch(HANDLE_RE)
  })

  it('skips an already-taken handle', async () => {
    const taken = await generateUniqueUsername(testDb)
    const user = await newUser()
    await testDb.insert(profiles).values({ userId: user.id, username: taken })
    for (let i = 0; i < 40; i++) {
      expect(await generateUniqueUsername(testDb)).not.toBe(taken)
    }
  })
})
