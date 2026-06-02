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
} from '@aurore/shared'
import { err, ok } from '@aurore/shared'

import { eq } from 'drizzle-orm'

import type { Database, DB } from '../../db/index'
import { bindRlsContext } from '../../db/rls'
import { users } from '../../db/schema'
import { isUniqueViolation } from '../../lib/helpers'
import { logger } from '../../lib/logger'
import { nowISO } from '../../utils/dates'
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

// argon2id default (~70 ms) makes hashing hundreds of fixture users prohibitive in tests.
// bcrypt cost=4 (~1-2 ms) keeps the full hash/verify path exercised while cutting cost ~50x.
// Bun.password.verify auto-detects algorithm from the hash prefix, so prod and test hashes interoperate.
const PASSWORD_HASH_OPTIONS: Parameters<typeof Bun.password.hash>[1] =
  process.env.NODE_ENV === 'test' ? { algorithm: 'bcrypt', cost: 4 } : undefined

// Prevents timing attacks: verify always runs even when the user doesn't exist.
const DUMMY_HASH = await Bun.password.hash('timing-safe-dummy', PASSWORD_HASH_OPTIONS)

// Account lockout: defense-in-depth against attackers rotating IPs against a single account.
const LOGIN_LOCKOUT_THRESHOLD = 5
const LOGIN_LOCKOUT_DURATION_MS = 15 * 60 * 1000

async function registerFailedLogin(db: DB, userId: string, currentAttempts: number): Promise<void> {
  const nextAttempts = currentAttempts + 1
  const lockedUntil =
    nextAttempts >= LOGIN_LOCKOUT_THRESHOLD
      ? new Date(Date.now() + LOGIN_LOCKOUT_DURATION_MS).toISOString()
      : null
  await db
    .update(users)
    .set({ failedLoginAttempts: nextAttempts, lockedUntil })
    .where(eq(users.id, userId))
}

async function resetFailedLogins(db: DB, userId: string): Promise<void> {
  await db
    .update(users)
    .set({ failedLoginAttempts: 0, lockedUntil: null })
    .where(eq(users.id, userId))
}

export async function createTokenPair(
  ctx: AuthContext,
  userId: string,
  role: 'user' | 'admin' | 'contributor'
) {
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

    const passwordHash = (await Bun.password.hash(
      password,
      PASSWORD_HASH_OPTIONS
    )) as HashedPassword

    const user = await ctx.db.transaction(async (tx) => {
      const user = await createUser(tx, {
        email,
        passwordHash,
        emailVerifiedAt: null,
      })
      // profiles insert requires app_runtime user_id set for WITH CHECK to pass.
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

    const isValid = await Bun.password.verify(password, user?.passwordHash ?? DUMMY_HASH)

    // Lockout check runs after hash verify to keep timing uniform across locked vs unknown-email paths.
    if (user?.lockedUntil && Date.parse(user.lockedUntil) > Date.now()) {
      return err('account_locked')
    }

    if (!user || !isValid) {
      if (user) await registerFailedLogin(ctx.db, user.id, user.failedLoginAttempts)
      return err('invalid_credentials')
    }

    if (!user.emailVerifiedAt) {
      const graceCutoffMs = Date.now() - 24 * 60 * 60 * 1000
      if (Date.parse(user.createdAt) < graceCutoffMs) return err('email_not_verified')
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil !== null) {
      await resetFailedLogins(ctx.db, user.id)
    }

    const tokens = await createTokenPair(ctx, user.id, user.role)

    cleanupUserRefreshTokens(ctx.db, user.id).catch((e) =>
      logger.error({ err: e }, 'Cleanup failed')
    )

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

    // Double-check DB: JWT valid but token may have been revoked since issuance.
    const storedToken = await findValidRefreshToken(ctx.db, payload.jti)
    if (!storedToken) {
      logger.warn({ userId: payload.sub }, 'Potential token replay')
      await revokeAllUserRefreshTokens(ctx.db, payload.sub)
      return err('invalid_token')
    }

    if (storedToken.userId !== payload.sub) {
      logger.error(
        { storedUserId: storedToken.userId, payloadSub: payload.sub },
        'Token userId mismatch'
      )
      await revokeAllUserRefreshTokens(ctx.db, payload.sub)
      await revokeAllUserRefreshTokens(ctx.db, storedToken.userId)
      return err('invalid_token')
    }
    const user = await getUserById(ctx.db, payload.sub)

    if (!user) {
      return err('invalid_token')
    }

    if (!user.emailVerified) {
      const graceCutoffMs = Date.now() - 24 * 60 * 60 * 1000
      if (Date.parse(user.createdAt) < graceCutoffMs) return err('email_not_verified')
    }
    // Cleanup before createTokenPair: only deletes expired/revoked tokens, not the active
    // payload.jti. If createTokenPair fails, the caller still holds a valid token.
    await cleanupUserRefreshTokens(ctx.db, payload.sub)

    const tokens = await createTokenPair(ctx, payload.sub, user.role)
    await revokeRefreshToken(ctx.db, payload.jti, payload.sub)

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
    if (payload) await revokeRefreshToken(ctx.db, payload.jti, payload.sub)
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
    if (!user?.passwordHash) {
      return err('invalid_credentials')
    }

    const isValid = await Bun.password.verify(currentPassword, user.passwordHash)
    if (!isValid) {
      return err('invalid_credentials')
    }

    const newPasswordHash = (await Bun.password.hash(
      newPassword,
      PASSWORD_HASH_OPTIONS
    )) as HashedPassword

    await ctx.db
      .update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: nowISO() })
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
        emailVerifiedAt: nowISO(),
        isDemo: true,
      })
      // app_runtime user_id required for WITH CHECK on all subsequent inserts in this tx.
      await bindRlsContext(tx, created.id)
      await createProfile(tx, created.id)
      // Seed inside the transaction so app.user_id is set for RLS-protected tables.
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
