import {
  type Email,
  emailSchema,
  type HashedPassword,
  type UserPublic,
} from '@habit-tracker/shared'

import { eq } from 'drizzle-orm'

import type { DB } from '../../db/index'
import type { User } from '../../db/schema'
import { profiles, users } from '../../db/schema'

// Returns the full user with password hash included (for login verification only)
export async function getUser(db: DB, email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1)
  return user ?? null
}
export function toPublicUser(user: User): UserPublic {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    emailVerified: user.emailVerifiedAt !== null,
    role: user.role,
  }
}
export async function getUserById(db: DB, userId: string): Promise<UserPublic | null> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      createdAt: users.createdAt,
      emailVerifiedAt: users.emailVerifiedAt,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    emailVerified: user.emailVerifiedAt !== null,
    role: user.role,
  }
}

export async function getFullUserById(db: DB, userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      emailVerifiedAt: users.emailVerifiedAt,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return user ?? null
}
export async function createUser(
  db: DB,
  userData: {
    email: Email
    passwordHash: HashedPassword | null
    emailVerifiedAt?: Date | null
  }
) {
  // Validate email format before insertion
  emailSchema.parse(userData.email)

  const [user] = await db
    .insert(users)
    .values({
      email: userData.email.trim().toLowerCase(),
      passwordHash: userData.passwordHash,
      emailVerifiedAt: userData.emailVerifiedAt,
    })
    .returning()

  if (!user) {
    throw new Error('Failed to create user')
  }

  return user
}
export async function createProfile(db: DB, userId: string, data?: { avatarUrl?: string | null }) {
  const [profile] = await db
    .insert(profiles)
    .values({ userId, avatarUrl: data?.avatarUrl ?? null })
    .returning()
  if (!profile) throw new Error('Failed to create profile')
  return profile
}
