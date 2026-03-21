import { CryptoHasher } from 'bun'

import { err, ok } from '@habit-tracker/shared'

import { and, eq, isNull, sql } from 'drizzle-orm'

import type { DB } from '../../db/index'
import { emailVerifications, users } from '../../db/schema'

// 1 hour
const TOKEN_EXPIRY_MS = 60 * 60 * 1000

function generateRawToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hashToken(rawToken: string): string {
  const hasher = new CryptoHasher('sha256')
  hasher.update(rawToken)
  return hasher.digest('hex')
}

// create verification token
export async function createVerificationToken(db: DB, userId: string): Promise<string> {
  const rawToken = generateRawToken()
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS)

  // invalidate old ones
  await db
    .update(emailVerifications)
    .set({ usedAt: sql`now()` })
    .where(and(eq(emailVerifications.userId, userId), isNull(emailVerifications.usedAt)))

  await db.insert(emailVerifications).values({
    userId,
    tokenHash,
    expiresAt,
  })

  return rawToken
}

// verify token
export async function verifyEmailToken(db: DB, rawToken: string) {
  const tokenHash = hashToken(rawToken)
  const now = new Date()

  const [row] = await db
    .select()
    .from(emailVerifications)
    .where(eq(emailVerifications.tokenHash, tokenHash))
    .limit(1)

  if (!row || row.usedAt !== null) {
    return err('invalid_token' as const)
  }

  if (row.expiresAt < now) {
    return err('token_expired' as const)
  }

  // user already verified?
  const [userRow] = await db
    .select({ emailVerifiedAt: users.emailVerifiedAt })
    .from(users)
    .where(eq(users.id, row.userId))
    .limit(1)

  if (userRow?.emailVerifiedAt !== null) {
    await db
      .update(emailVerifications)
      .set({ usedAt: sql`now()` })
      .where(eq(emailVerifications.id, row.id))
    return ok(row.userId)
  }

  await db.transaction(async (tx) => {
    await tx
      .update(emailVerifications)
      .set({ usedAt: sql`now()` })
      .where(eq(emailVerifications.id, row.id))

    await tx.update(users).set({ emailVerifiedAt: sql`now()` }).where(eq(users.id, row.userId))
  })

  return ok(row.userId)
}

export async function hasVerifiedEmail(db: DB, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ emailVerifiedAt: users.emailVerifiedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return row?.emailVerifiedAt !== null && row?.emailVerifiedAt !== undefined
}
