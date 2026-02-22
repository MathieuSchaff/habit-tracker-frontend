import type {
  Email,
  HashedPassword,
  LoginResult,
  LogoutResult,
  RawPassword,
  RefreshResult,
  SignupResult,
} from '@habit-tracker/shared'
import { err, ok } from '@habit-tracker/shared'

import { hash, verify } from 'argon2'

import type { DB } from '../../db/index'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from './jwt.utils'
import {
  cleanupUserRefreshTokens,
  findValidRefreshToken,
  revokeAllUserRefreshTokens,
  revokeRefreshToken,
  storeRefreshToken,
} from './refresh-token.service'
import { createProfile, createUser, getUser, getUserById, toPublicUser } from './user.utils'

export type AuthContext = {
  db: DB
  jwtSecret: string
  refreshSecret: string
  ip?: string
  userAgent?: string
}

const DUMMY_HASH = await hash('timing-safe-dummy')

function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === '23505'
  )
}

async function createTokenPair(ctx: AuthContext, userId: string) {
  const accessToken = await generateAccessToken(userId, ctx.jwtSecret)
  const {
    token: refreshToken,
    jti,
    expiresAt,
  } = await generateRefreshToken(userId, ctx.refreshSecret)

  await storeRefreshToken(ctx.db, {
    userId,
    jti,
    expiresAt,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  })

  return { accessToken, refreshToken }
}

//  Signup

export async function signup(
  ctx: AuthContext,
  email: Email,
  password: RawPassword
): Promise<SignupResult> {
  try {
    const existingUser = await getUser(ctx.db, email)
    if (existingUser) return err('email_exists')

    const passwordHash = (await hash(password)) as HashedPassword

    const user = await ctx.db.transaction(async (tx) => {
      const user = await createUser(tx, { email, passwordHash })
      await createProfile(tx, user.id)
      return user
    })

    const tokens = await createTokenPair(ctx, user.id)

    return ok({
      user: toPublicUser(user),
      ...tokens,
    })
  } catch (e) {
    if (isUniqueViolation(e)) return err('email_exists')
    console.error('Signup failed:', e)
    return err('server_error')
  }
}

export async function login(
  ctx: AuthContext,
  email: Email,
  password: RawPassword
): Promise<LoginResult> {
  try {
    const user = await getUser(ctx.db, email)

    const isValid = await verify(user?.passwordHash ?? DUMMY_HASH, password)
    if (!user || !isValid) return err('invalid_credentials')

    const tokens = await createTokenPair(ctx, user.id)

    cleanupUserRefreshTokens(ctx.db, user.id).catch((e) => console.error('Cleanup failed:', e))

    return ok({
      user: toPublicUser(user),
      ...tokens,
    })
  } catch (e) {
    console.error('Login failed:', e)
    return err('server_error')
  }
}

//  Refresh

export async function refresh(ctx: AuthContext, rawRefreshToken: string): Promise<RefreshResult> {
  try {
    const payload = await verifyRefreshToken(rawRefreshToken, ctx.refreshSecret)
    if (!payload) return err('invalid_token')

    const storedToken = await findValidRefreshToken(ctx.db, payload.jti)
    if (!storedToken) {
      console.warn(`Potential token replay for user ${payload.sub}`)
      await revokeAllUserRefreshTokens(ctx.db, payload.sub)
      return err('invalid_token')
    }

    if (storedToken.userId !== payload.sub) {
      console.error(`Token userId mismatch: stored=${storedToken.userId}, payload=${payload.sub}`)
      await revokeAllUserRefreshTokens(ctx.db, payload.sub)
      await revokeAllUserRefreshTokens(ctx.db, storedToken.userId)
      return err('invalid_token')
    }
    const user = await getUserById(ctx.db, payload.sub)

    if (!user) {
      return err('invalid_token')
    }
    const tokens = await createTokenPair(ctx, payload.sub)
    await revokeRefreshToken(ctx.db, payload.jti)

    return ok({
      user,
      ...tokens,
    })
  } catch (e) {
    console.error('Refresh failed:', e)
    return err('server_error')
  }
}

export async function logout(ctx: AuthContext, rawRefreshToken: string): Promise<LogoutResult> {
  try {
    const payload = await verifyRefreshToken(rawRefreshToken, ctx.refreshSecret)
    if (payload) await revokeRefreshToken(ctx.db, payload.jti)
    return ok(null)
  } catch {
    console.error('Logout failed')
    return ok(null)
  }
}
