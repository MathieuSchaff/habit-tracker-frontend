import type { CreateRefreshTokenArgs } from '@habit-tracker/shared'

import { and, eq, gt, isNotNull, isNull, lt, or, sql } from 'drizzle-orm'

import type { DB } from '../../db/index'
import { logger } from '../../lib/logger'
import { refreshTokens } from '../../db/schema'
import { hashJti } from './jwt.utils'

export async function storeRefreshToken(db: DB, args: CreateRefreshTokenArgs) {
  const jtiHash = hashJti(args.jti)

  try {
    await db.insert(refreshTokens).values({
      userId: args.userId,
      jtiHash,
      expiresAt: args.expiresAt,
      ip: args.ip ?? null,
      userAgent: args.userAgent ?? null,
    })
  } catch (error) {
    // Should not happen — unique constraint on jtiHash ensures no duplicates
    logger.error({ err: error }, 'Failed to store refresh token')
    throw new Error('duplicate_refresh_token')
  }
}

export async function findValidRefreshToken(db: DB, jti: string) {
  const jtiHash = hashJti(jti)
  const now = new Date()

  const [row] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.jtiHash, jtiHash),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, now)
      )
    )
    .limit(1)

  return row ?? null
}

// Mark token as revoked when it's rotated (new token issued) or user logs out
export async function revokeRefreshToken(db: DB, jti: string) {
  const jtiHash = hashJti(jti)
  await db
    .update(refreshTokens)
    .set({ revokedAt: sql`now()` })
    .where(eq(refreshTokens.jtiHash, jtiHash))
}

// Revoke all tokens for user if we detect token replay (security incident)
export async function revokeAllUserRefreshTokens(db: DB, userId: string) {
  await db
    .update(refreshTokens)
    .set({ revokedAt: sql`now()` })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)))
}

// Delete expired or revoked tokens from database (fire-and-forget cleanup after login)
export async function cleanupUserRefreshTokens(db: DB, userId: string) {
  const now = new Date()
  await db
    .delete(refreshTokens)
    .where(
      and(
        eq(refreshTokens.userId, userId),
        or(lt(refreshTokens.expiresAt, now), isNotNull(refreshTokens.revokedAt))
      )
    )
}
