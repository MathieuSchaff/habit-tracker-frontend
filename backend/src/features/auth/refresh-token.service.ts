import type { CreateRefreshTokenArgs } from '@habit-tracker/shared'

import { and, eq, gt, isNotNull, isNull, lt, or } from 'drizzle-orm'

import type { DB } from '../../db/index'
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
    // Si le JTI existe déjà (race condition ou bug)
    console.error('Failed to store refresh token:', error)
    throw new Error('duplicate_refresh_token')
  }
}

//  Cherche un refresh token valide (non révoqué, non expiré) par son jti.
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

// Révoque un refresh token spécifique (par jti).
// Utilisé lors de la rotation ou du logout.
export async function revokeRefreshToken(db: DB, jti: string) {
  const jtiHash = hashJti(jti)
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.jtiHash, jtiHash))
}

// Révoque TOUS les refresh tokens d'un user.
// Utilisé en cas de compromission détectée (token replay).
export async function revokeAllUserRefreshTokens(db: DB, userId: string) {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)))
}

// Nettoie les refresh tokens expirés ou révoqués d'un user.
// Fire-and-forget après un login.
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
