import type {
  ChangePasswordResult,
  Email,
  HashedPassword,
  LoginResult,
  LogoutResult,
  RawPassword,
  RefreshResult,
  SignupResult,
} from '@habit-tracker/shared'
import { err, ok } from '@habit-tracker/shared'

import { eq } from 'drizzle-orm'

import type { DB } from '../../db/index'
import { users } from '../../db/schema'
import { isUniqueViolation } from '../../lib/helpers'
import { sendVerificationEmail } from './email.service'
import { createVerificationToken } from './email-verification.service'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from './jwt.utils'
import {
  cleanupUserRefreshTokens,
  findValidRefreshToken,
  revokeAllUserRefreshTokens,
  revokeRefreshToken,
  storeRefreshToken,
} from './refresh-token.service'
import {
  createProfile,
  createUser,
  getFullUserById,
  getUser,
  getUserById,
  toPublicUser,
} from './user.utils'

export type AuthContext = {
  db: DB
  jwtSecret: string
  refreshSecret: string
  frontendUrl: string
  ip?: string
  userAgent?: string
}

const DUMMY_HASH = await Bun.password.hash('timing-safe-dummy')

// auth token pair
export async function createTokenPair(ctx: AuthContext, userId: string) {
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

// signup
export async function signup(
  ctx: AuthContext,
  email: Email,
  password: RawPassword
): Promise<SignupResult> {
  try {
    const existingUser = await getUser(ctx.db, email)
    if (existingUser) return err('email_exists')

    const passwordHash = (await Bun.password.hash(password)) as HashedPassword

    const isDev = Bun.env.NODE_ENV === 'development'

    const user = await ctx.db.transaction(async (tx) => {
      const user = await createUser(tx, {
        email,
        passwordHash,
        emailVerifiedAt: isDev ? new Date() : null,
      })
      await createProfile(tx, user.id)
      return user
    })

    const tokens = await createTokenPair(ctx, user.id)

    let rawToken: string | null = null
    try {
      rawToken = await createVerificationToken(ctx.db, user.id)
    } catch (tokenErr) {
      console.error('Failed to create verification token (best-effort):', tokenErr)
    }

    if (rawToken !== null) {
      const verificationUrl = `${ctx.frontendUrl}/verify-email?token=${rawToken}`
      try {
        await sendVerificationEmail(user.email, verificationUrl)
      } catch (emailErr) {
        console.error('Verification email send failed (best-effort):', emailErr)
      }
    }

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

// login
export async function login(
  ctx: AuthContext,
  email: Email,
  password: RawPassword
): Promise<LoginResult> {
  try {
    const user = await getUser(ctx.db, email)

    const isValid = await Bun.password.verify(password, user?.passwordHash ?? DUMMY_HASH)
    if (!user || !isValid) return err('invalid_credentials')

    if (!user.emailVerifiedAt) {
      const graceExpired = user.createdAt < new Date(Date.now() - 24 * 60 * 60 * 1000)
      if (graceExpired) return err('email_not_verified')
    }

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

// refresh
export async function refresh(ctx: AuthContext, rawRefreshToken: string): Promise<RefreshResult> {
  try {
    const payload = await verifyRefreshToken(rawRefreshToken, ctx.refreshSecret)
    if (!payload) return err('invalid_token')
    // look if refresh token exist and is not revoked
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

    if (!user.emailVerified) {
      const createdAt = user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt)
      const graceExpired = createdAt < new Date(Date.now() - 24 * 60 * 60 * 1000)
      if (graceExpired) return err('email_not_verified')
    }
    await cleanupUserRefreshTokens(ctx.db, payload.sub)

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

export async function changePassword(
  ctx: AuthContext,
  userId: string,
  currentPassword: RawPassword,
  newPassword: RawPassword
): Promise<ChangePasswordResult> {
  try {
    const user = await getFullUserById(ctx.db, userId)
    if (!user || !user.passwordHash) {
      return err('invalid_credentials')
    }

    const isValid = await Bun.password.verify(currentPassword, user.passwordHash)
    if (!isValid) {
      return err('invalid_credentials')
    }

    const newPasswordHash = (await Bun.password.hash(newPassword)) as HashedPassword

    await ctx.db
      .update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
      .where(eq(users.id, userId))

    // Revoke other sessions (optional but recommended)
    // await revokeAllUserRefreshTokens(ctx.db, userId)

    return ok(null)
  } catch (e) {
    console.error('Change password failed:', e)
    return err('server_error')
  }
}
