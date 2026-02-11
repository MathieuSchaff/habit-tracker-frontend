import { hash } from 'argon2'

import { profiles, users } from '../../db/schema'
import { testDb } from '../db.test.config'

export async function createTestUser(email: string, password: string) {
  const passwordHash = await hash(password ?? 'azerty123', {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  })

  const [user] = await testDb
    .insert(users)
    .values({
      email: email ?? `test${Date.now()}@exemple.com`,
      passwordHash,
    })
    .returning()

  if (!user) throw new Error("couldn't create user")

  await testDb.insert(profiles).values({
    userId: user.id,
  })

  return user
}
