import type { Email, RawPassword } from '@habit-tracker/shared'

import { eq } from 'drizzle-orm'

import { users } from '../../db/schema'
import { signup } from '../../features/auth/service'
import { createCtx } from '../../features/auth/tests/auth-test.setup'
import { getUser } from '../../features/auth/user.utils'
import { testDb } from '../db.test.config'

export async function createTestUser(
  email: string = 'toto@toto.com',
  password: string = 'Azerty123!'
) {
  const ctx = createCtx()

  const result = await signup(ctx, email as Email, password as RawPassword)

  if (result.success === false) {
    if (result.error === 'email_exists') {
      const user = await getUser(ctx.db, email as Email)
      if (!user) {
        throw new Error(`User claimed to exist but not found: ${email}`)
      }
      return user
    }
    throw new Error(`Failed to create test user: ${result.error}`)
  }

  return result.data.user
}

export async function createTestAdminUser(
  email: string = 'admin@toto.com',
  password: string = 'Azerty123!'
) {
  const user = await createTestUser(email, password)
  await testDb.update(users).set({ role: 'admin' }).where(eq(users.id, user.id))
  return user
}
