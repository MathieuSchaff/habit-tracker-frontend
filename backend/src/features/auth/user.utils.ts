import { eq } from 'drizzle-orm'

import type { DB } from '../../db/index'
import { profiles, users } from '../../db/schema'

export type UserPublic = {
  id: string
  email: string
  createdAt: Date
  updatedAt: Date
}

// ATTENTION CA RENVOIE LE PASSWORD HASH
export async function getUser(db: DB, email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1)
  return user ?? null
}
export function toPublicUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
  }
}
export async function getUserById(db: DB, userId: string): Promise<UserPublic | null> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

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

  if (!user) {
    throw new Error('Failed to create user')
  }

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

  if (!profile) {
    throw new Error('Failed to create user')
  }
  return profile
}
