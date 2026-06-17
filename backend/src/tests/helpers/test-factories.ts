import type { Email, RawPassword } from '@aurore/shared'

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
    throw new Error(`Failed to create test user: ${result.error}`)
  }

  // Signup is enumeration-safe and returns no user (ADR 0009). It always reports
  // success (new or existing email), so fetch the row; this also makes the
  // factory idempotent across re-use of the same email.
  const user = await getUser(ctx.db, email as Email)
  if (!user) {
    throw new Error(`User not found after signup: ${email}`)
  }
  return user
}

export async function createTestAdminUser(
  email: string = 'admin@toto.com',
  password: string = 'Azerty123!'
) {
  const user = await createTestUser(email, password)
  await testDb.update(users).set({ role: 'admin' }).where(eq(users.id, user.id))
  return user
}

export async function createTestContributorUser(
  email: string = 'contributor@toto.com',
  password: string = 'Azerty123!'
) {
  const user = await createTestUser(email, password)
  await testDb.update(users).set({ role: 'contributor' }).where(eq(users.id, user.id))
  return user
}
