import { profiles, users } from '../../db/schema'
import type { DB } from '../../db/index'
import { eq } from 'drizzle-orm'

export async function getUser(db: DB, email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

  return user ?? null
}

export async function getUserById(db: DB, userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)

  return user ?? null
}

export async function createUser(
  db: DB,
  userData: {
    email: string
    passwordHash: string
  }
) {
  const [user] = await db
    .insert(users)
    .values({
      email: userData.email.trim().toLowerCase(),
      passwordHash: userData.passwordHash,
    })
    .returning()

  return user
}

export async function createProfile(
  db: DB,
  profileData: {
    userId: string
    firstName?: string
    lastName?: string
  }
) {
  const [profile] = await db
    .insert(profiles)
    .values({
      userId: profileData.userId,
    })
    .returning()

  return profile
}
