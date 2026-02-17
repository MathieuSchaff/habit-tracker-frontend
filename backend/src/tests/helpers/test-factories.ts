import type { Email, RawPassword } from '@habit-tracker/shared'

import { signup } from '../../features/auth/service'
import { getUser } from '../../features/auth/user.utils'
import { createCtx } from '../services/auth/auth-test.setup'

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
