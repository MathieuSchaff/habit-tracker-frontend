import type { CreateRefreshTokenArgs } from '@habit-tracker/shared'

import { and, eq, isNotNull, isNull, lt, or, sql } from 'drizzle-orm'

import type { DB } from '../../db/index'
import { bindRlsContext } from '../../db/rls'
import { refreshTokens } from '../../db/schema'
import { logger } from '../../lib/logger'
import { nowISO } from '../../utils/dates'
import { hashJti } from './jwt.utils'

type RefreshTokenRow = typeof refreshTokens.$inferSelect

// Maps the snake_case row returned by SELECT * FROM auth.find_active_refresh_token
// (only path that bypasses RLS for the pre-identity lookup) into the camelCase
// shape Drizzle would have produced.
function mapRefreshTokenRow(row: Record<string, unknown> | undefined): RefreshTokenRow | null {
  if (!row || row.id == null) return null
  return {
    id: row.id as string,
    userId: row.user_id as string,
    jtiHash: row.jti_hash as string,
    expiresAt: row.expires_at as string,
    revokedAt: (row.revoked_at as string | null) ?? null,
    lastUsedAt: (row.last_used_at as string | null) ?? null,
    ip: (row.ip as string | null) ?? null,
    userAgent: (row.user_agent as string | null) ?? null,
    createdAt: row.created_at as string,
  }
}

export async function storeRefreshToken(db: DB, args: CreateRefreshTokenArgs) {
  const jtiHash = hashJti(args.jti)

  try {
    await db.transaction(async (tx) => {
      await bindRlsContext(tx, args.userId)
      await tx.insert(refreshTokens).values({
        userId: args.userId,
        jtiHash,
        expiresAt: args.expiresAt,
        ip: args.ip ?? null,
        userAgent: args.userAgent ?? null,
      })
    })
  } catch (error) {
    // Should not happen — unique constraint on jtiHash ensures no duplicates
    logger.error({ err: error }, 'Failed to store refresh token')
    throw new Error('duplicate_refresh_token')
  }
}

// Pre-identity lookup: at this point we don't yet know whose token this is,
// so RLS would filter the row out. Goes through SECURITY DEFINER fn that
// bypasses RLS for this single read. Caller MUST verify row.userId against
// the JWT payload's sub before trusting it.
export async function findValidRefreshToken(db: DB, jti: string) {
  const jtiHash = hashJti(jti)
  const result = await db.execute(sql`SELECT * FROM auth.find_active_refresh_token(${jtiHash})`)
  return mapRefreshTokenRow((result as unknown as Record<string, unknown>[])[0])
}

// Mark token as revoked when it's rotated (new token issued) or user logs out.
// userId required so we can bind RLS context — the callers already know it
// from JWT payload.sub, no extra lookup.
export async function revokeRefreshToken(db: DB, jti: string, userId: string) {
  const jtiHash = hashJti(jti)
  await db.transaction(async (tx) => {
    await bindRlsContext(tx, userId)
    await tx
      .update(refreshTokens)
      .set({ revokedAt: sql`now()` })
      .where(eq(refreshTokens.jtiHash, jtiHash))
  })
}

// Revoke all tokens for user if we detect token replay (security incident)
export async function revokeAllUserRefreshTokens(db: DB, userId: string) {
  await db.transaction(async (tx) => {
    await bindRlsContext(tx, userId)
    await tx
      .update(refreshTokens)
      .set({ revokedAt: sql`now()` })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)))
  })
}

// Delete expired or revoked tokens from database (fire-and-forget cleanup after login)
export async function cleanupUserRefreshTokens(db: DB, userId: string) {
  const now = nowISO()
  await db.transaction(async (tx) => {
    await bindRlsContext(tx, userId)
    await tx
      .delete(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, userId),
          or(lt(refreshTokens.expiresAt, now), isNotNull(refreshTokens.revokedAt))
        )
      )
  })
}
