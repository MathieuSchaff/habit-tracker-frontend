import type { CreateRefreshTokenArgs } from '@aurore/shared'

import { and, eq, isNotNull, isNull, lt, or, sql } from 'drizzle-orm'

import type { DB, Transaction } from '../../db/index'
import { bindRlsContext } from '../../db/rls'
import { refreshTokens } from '../../db/schema'
import { logger } from '../../lib/logger'
import { nowISO } from '../../utils/dates'
import { hashJti } from './jwt.utils'

type RefreshTokenRow = typeof refreshTokens.$inferSelect

// Maps the snake_case row from auth.find_active_refresh_token (SECURITY DEFINER,
// bypasses RLS for pre-identity lookup) into the camelCase shape Drizzle produces.
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
    // jtiHash unique constraint violation: UUIDv7 collision is theoretically possible.
    logger.error({ err: error }, 'Failed to store refresh token')
    throw new Error('duplicate_refresh_token')
  }
}

// Pre-identity lookup: RLS would filter the row because we don't know userId yet.
// Uses SECURITY DEFINER fn to bypass RLS. Caller MUST verify row.userId against
// JWT payload.sub before trusting it.
export async function findValidRefreshToken(db: DB, jti: string) {
  const jtiHash = hashJti(jti)
  const result = await db.execute(sql`SELECT * FROM auth.find_active_refresh_token(${jtiHash})`)
  return mapRefreshTokenRow((result as unknown as Record<string, unknown>[])[0])
}

// userId required to bind RLS context; callers already have it from JWT payload.sub.
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

// Full revocation on token replay detection (security incident response).
// Pass an existing tx to revoke atomically with the caller's own writes
// (e.g. password change must not commit while leaving stale tokens alive).
export async function revokeAllUserRefreshTokens(db: DB, userId: string, existingTx?: Transaction) {
  const run = async (tx: Transaction) => {
    await bindRlsContext(tx, userId)
    await tx
      .update(refreshTokens)
      .set({ revokedAt: sql`now()` })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)))
  }

  if (existingTx) return run(existingTx)
  await db.transaction(run)
}

// Fire-and-forget cleanup of expired/revoked tokens after login.
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
