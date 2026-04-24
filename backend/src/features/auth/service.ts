import type {
  ApiResponse,
  AuthenticatedResult,
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

import type { Database, DB } from '../../db/index'
import { bindRlsContext } from '../../db/rls'
import { users } from '../../db/schema'
import { isUniqueViolation } from '../../lib/helpers'
import { logger } from '../../lib/logger'
import { seedDemoData } from './demo-seed'
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

// Dummy hash to prevent timing attacks when user doesn't exist (takes same time to verify a wrong password)
const DUMMY_HASH = await Bun.password.hash('timing-safe-dummy')

export async function createTokenPair(ctx: AuthContext, userId: string, role: 'user' | 'admin') {
  const accessToken = await generateAccessToken(userId, role, ctx.jwtSecret)
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

export async function signup(
  ctx: AuthContext,
  email: Email,
  password: RawPassword
): Promise<SignupResult> {
  try {
    const existingUser = await getUser(ctx.db, email)
    if (existingUser) return err('email_exists')

    const passwordHash = (await Bun.password.hash(password)) as HashedPassword

    const user = await ctx.db.transaction(async (tx) => {
      const user = await createUser(tx, {
        email,
        passwordHash,
        emailVerifiedAt: null,
      })
      // Set RLS context so the profiles insert passes WITH CHECK on app_runtime.
      await bindRlsContext(tx, user.id)
      await createProfile(tx, user.id)
      return user
    })

    const tokens = await createTokenPair(ctx, user.id, user.role)

    let rawToken: string | null = null
    try {
      rawToken = await createVerificationToken(ctx.db, user.id)
    } catch (tokenErr) {
      logger.error({ err: tokenErr }, 'Failed to create verification token (best-effort)')
    }

    if (rawToken !== null) {
      const verificationUrl = `${ctx.frontendUrl}/auth/verify-email?token=${rawToken}`
      try {
        await sendVerificationEmail(user.email, verificationUrl)
      } catch (emailErr) {
        logger.error({ err: emailErr }, 'Verification email send failed (best-effort)')
      }
    }

    return ok({
      user: toPublicUser(user),
      ...tokens,
    })
  } catch (e) {
    if (isUniqueViolation(e)) return err('email_exists')
    logger.error({ err: e }, 'Signup failed')
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

    // Always verify against DUMMY_HASH if user doesn't exist (prevents timing attacks)
    const isValid = await Bun.password.verify(password, user?.passwordHash ?? DUMMY_HASH)
    if (!user || !isValid) return err('invalid_credentials')

    if (!user.emailVerifiedAt) {
      const graceExpired = user.createdAt < new Date(Date.now() - 24 * 60 * 60 * 1000)
      if (graceExpired) return err('email_not_verified')
    }

    const tokens = await createTokenPair(ctx, user.id, user.role)

    cleanupUserRefreshTokens(ctx.db, user.id).catch((e) => logger.error({ err: e }, 'Cleanup failed'))

    return ok({
      user: toPublicUser(user),
      ...tokens,
    })
  } catch (e) {
    logger.error({ err: e }, 'Login failed')
    return err('server_error')
  }
}

export async function refresh(ctx: AuthContext, rawRefreshToken: string): Promise<RefreshResult> {
  try {
    const payload = await verifyRefreshToken(rawRefreshToken, ctx.refreshSecret)
    if (!payload) return err('invalid_token')

    // Verify token exists and hasn't been revoked (double-check after JWT validation)
    const storedToken = await findValidRefreshToken(ctx.db, payload.jti)
    if (!storedToken) {
      logger.warn({ userId: payload.sub }, 'Potential token replay')
      await revokeAllUserRefreshTokens(ctx.db, payload.sub)
      return err('invalid_token')
    }

    if (storedToken.userId !== payload.sub) {
      logger.error({ storedUserId: storedToken.userId, payloadSub: payload.sub }, 'Token userId mismatch')
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
    // Order matters: cleanup runs BEFORE createTokenPair, which is safe because
    // it only deletes expired or already-revoked tokens — not the active one
    // being used right now (payload.jti). If createTokenPair fails, the caller
    // still holds a valid token and can retry.
    await cleanupUserRefreshTokens(ctx.db, payload.sub)

    const tokens = await createTokenPair(ctx, payload.sub, user.role)
    await revokeRefreshToken(ctx.db, payload.jti)

    return ok({
      user,
      ...tokens,
    })
  } catch (e) {
    logger.error({ err: e }, 'Refresh failed')
    return err('server_error')
  }
}

export async function logout(ctx: AuthContext, rawRefreshToken: string): Promise<LogoutResult> {
  try {
    const payload = await verifyRefreshToken(rawRefreshToken, ctx.refreshSecret)
    if (payload) await revokeRefreshToken(ctx.db, payload.jti)
    return ok(null)
  } catch {
    logger.error('Logout failed')
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

    return ok(null)
  } catch (e) {
    logger.error({ err: e }, 'Change password failed')
    return err('server_error')
  }
}

export async function createDemo(
  ctx: AuthContext
): Promise<ApiResponse<AuthenticatedResult, 'server_error'>> {
  try {
    const email = `demo-${crypto.randomUUID()}@demo.local` as Email

    const user = await ctx.db.transaction(async (tx) => {
      const created = await createUser(tx, {
        email,
        passwordHash: null,
        emailVerifiedAt: new Date(),
        isDemo: true,
      })
      // Set RLS context so all inserts in this transaction pass WITH CHECK on app_runtime.
      await bindRlsContext(tx, created.id)
      await createProfile(tx, created.id)
      // Seed inside the transaction so app.user_id is still set for RLS-protected tables.
      await seedDemoData(created.id, tx as unknown as Database)
      return created
    })

    const tokens = await createTokenPair(ctx, user.id, user.role)

    return ok({
      user: toPublicUser(user),
      ...tokens,
    })
  } catch (e) {
    logger.error({ err: e }, 'Demo creation failed')
    return err('server_error')
  }
}
