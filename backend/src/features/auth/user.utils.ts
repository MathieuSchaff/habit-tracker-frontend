import {
  type Email,
  emailSchema,
  type HashedPassword,
  type UserPublic,
} from '@habit-tracker/shared'

import { eq, sql } from 'drizzle-orm'

import type { DB } from '../../db/index'
import type { User, UserSafe } from '../../db/schema'
import { profiles, users, usersSafe } from '../../db/schema'

// Maps a snake_case row returned by SELECT * FROM auth.find_user_*() into the
// camelCase User shape Drizzle would have produced. Lives here because the
// SECURITY DEFINER functions are the only path that hands back password_hash.
function mapUserRow(row: Record<string, unknown> | undefined): User | null {
  if (!row || row.id == null) return null
  return {
    id: row.id as string,
    email: row.email as string,
    passwordHash: row.password_hash as HashedPassword | null,
    googleSub: row.google_sub as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    emailVerifiedAt: (row.email_verified_at as string | null) ?? null,
    role: row.role as User['role'],
    deletedAt: (row.deleted_at as string | null) ?? null,
    isDemo: row.is_demo as boolean,
    expiresAt: (row.expires_at as string | null) ?? null,
  }
}

// Returns the full user with password_hash (for login verification only).
// Goes through SECURITY DEFINER fn — direct SELECT password_hash is denied
// to app_runtime since migration 0038.
export async function getUser(db: DB, email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const result = await db.execute(
    sql`SELECT * FROM auth.find_user_with_hash_by_email(${normalizedEmail})`
  )
  return mapUserRow((result as unknown as Record<string, unknown>[])[0])
}

// Used by Google OAuth callback to find an existing user linked by their
// stable Google sub. Goes through SECURITY DEFINER fn — direct SELECT
// google_sub is denied to app_runtime since migration 0038.
export async function getUserByGoogleSub(db: DB, googleSub: string) {
  const result = await db.execute(sql`SELECT * FROM auth.find_user_by_google_sub(${googleSub})`)
  return mapUserRow((result as unknown as Record<string, unknown>[])[0])
}
// Accepts both User (with hash, from SECURITY DEFINER fns) and UserSafe (view
// projection, from createUser RETURNING). Structural type — the wider User is
// assignable to the narrower UserSafe param.
export function toPublicUser(user: UserSafe): UserPublic {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    emailVerified: user.emailVerifiedAt !== null,
    role: user.role,
    isDemo: user.isDemo,
  }
}
export async function getUserById(db: DB, userId: string): Promise<UserPublic | null> {
  const [user] = await db
    .select({
      id: usersSafe.id,
      email: usersSafe.email,
      createdAt: usersSafe.createdAt,
      emailVerifiedAt: usersSafe.emailVerifiedAt,
      role: usersSafe.role,
      isDemo: usersSafe.isDemo,
    })
    .from(usersSafe)
    .where(eq(usersSafe.id, userId))
    .limit(1)

  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    emailVerified: user.emailVerifiedAt !== null,
    role: user.role,
    isDemo: user.isDemo,
  }
}

// Returns the full user including password_hash (used by changePassword to
// verify the current password). Goes through SECURITY DEFINER fn.
export async function getFullUserById(db: DB, userId: string) {
  const result = await db.execute(sql`SELECT * FROM auth.find_user_with_hash_by_id(${userId})`)
  return mapUserRow((result as unknown as Record<string, unknown>[])[0])
}
export async function createUser(
  db: DB,
  userData: {
    email: Email
    passwordHash: HashedPassword | null
    emailVerifiedAt?: string | null
    isDemo?: boolean
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
      isDemo: userData.isDemo ?? false,
    })
    .returning({
      id: users.id,
      email: users.email,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      emailVerifiedAt: users.emailVerifiedAt,
      role: users.role,
      deletedAt: users.deletedAt,
      isDemo: users.isDemo,
      expiresAt: users.expiresAt,
    })

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
