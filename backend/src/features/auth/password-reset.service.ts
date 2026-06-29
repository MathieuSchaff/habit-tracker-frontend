import type {
  ForgotPasswordResult,
  HashedPassword,
  RawPassword,
  ResetPasswordResult,
} from '@aurore/shared'
import { err, ok } from '@aurore/shared'

import { and, eq, isNotNull, isNull, lt, or, sql } from 'drizzle-orm'

import type { DB } from '../../db/index'
import { passwordResets, users } from '../../db/schema'
import { logger } from '../../lib/logger'
import { sendPasswordResetEmail } from './email.service'
import { revokeAllUserRefreshTokens } from './refresh-token.service'
import type { AuthContext } from './service'
import { generateRawToken, hashToken } from './token.utils'
import { getUser } from './user.utils'

const TOKEN_EXPIRY_MS = 60 * 60 * 1000

// Same test-only knob as service.ts: bcrypt cost=4 keeps hashing ~1-2 ms in tests
// instead of argon2's ~70 ms, while still exercising the real hash path.
const PASSWORD_HASH_OPTIONS: Parameters<typeof Bun.password.hash>[1] =
  process.env.NODE_ENV === 'test' ? { algorithm: 'bcrypt', cost: 4 } : undefined

export async function createPasswordResetToken(db: DB, userId: string): Promise<string> {
  const rawToken = generateRawToken()
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS).toISOString()

  // Atomic: invalidating prior tokens and issuing the new one must commit together,
  // or a failed insert would silently leave the user with no working link.
  await db.transaction(async (tx) => {
    await tx
      .update(passwordResets)
      .set({ usedAt: sql`now()` })
      .where(and(eq(passwordResets.userId, userId), isNull(passwordResets.usedAt)))

    // Opportunistic hygiene (mirrors cleanupUserRefreshTokens on login): drop this
    // user's consumed/expired rows so the table never grows unbounded, folded into
    // the same tx so the real branch stays one round-trip. The fresh token inserted
    // below is active and unexpired, so it's never caught here.
    await tx
      .delete(passwordResets)
      .where(
        and(
          eq(passwordResets.userId, userId),
          or(isNotNull(passwordResets.usedAt), lt(passwordResets.expiresAt, sql`now()`))
        )
      )

    await tx.insert(passwordResets).values({
      userId,
      tokenHash,
      expiresAt,
    })
  })

  return rawToken
}

// Enumeration-safe (ADR 0010): unknown-email and existing-email branches return the
// SAME neutral `ok({ pending: true })`, no session, with the reset link delivered
// only by email to the address owner. Any divergence (code, status, latency) re-leaks
// existence. Mirror of signup() in service.ts.
export async function requestPasswordReset(
  ctx: AuthContext,
  email: string
): Promise<ForgotPasswordResult> {
  try {
    const user = await getUser(ctx.db, email)

    // Unknown email OR OAuth-only account (no password to reset, mirroring
    // changePassword's !passwordHash guard): stay neutral so neither leaks existence
    // and a Google-only account can't have a password silently grafted on by reset.
    if (!user?.passwordHash) {
      // Timing equalization: the real branch awaits createPasswordResetToken — both the
      // token hash AND a DB transaction. Mirror both here (the discarded hash plus a
      // no-op transactional read) or the faster dummy branch re-leaks existence over
      // enough samples. Mirror of login's DUMMY_HASH discipline.
      hashToken(generateRawToken())
      await ctx.db.transaction(async (tx) => {
        await tx.select({ one: sql`1` }).from(passwordResets).where(sql`false`).limit(1)
      })
      return ok({ pending: true })
    }

    let rawToken: string | null = null
    try {
      rawToken = await createPasswordResetToken(ctx.db, user.id)
    } catch (tokenErr) {
      logger.error({ err: tokenErr }, 'Failed to create password-reset token (best-effort)')
    }

    if (rawToken !== null) {
      const resetUrl = `${ctx.frontendUrl}/auth/reset-password?token=${rawToken}`
      // Fire-and-forget so the response returns in the same time as the unknown-email
      // branch; awaiting the mail send would make the existing branch slower (an oracle).
      void sendPasswordResetEmail(user.email, resetUrl)
    }

    return ok({ pending: true })
  } catch (e) {
    logger.error({ err: e }, 'Password-reset request failed')
    return err('server_error')
  }
}

// Token-holder-only path on a 2^256 space: a distinct invalid-vs-expired code is
// tolerated (no cross-user enumeration gain). The neutrality lives on the *request*
// endpoint above. Mirror of verifyEmailToken.
export async function resetPassword(
  ctx: AuthContext,
  rawToken: string,
  newPassword: RawPassword
): Promise<ResetPasswordResult> {
  try {
    const tokenHash = hashToken(rawToken)

    // Cheap pre-check before the ~70 ms argon2 hash: a bogus token must not cost a
    // password hash (/reset-password has no failure-counting limiter → CPU-exhaustion).
    // The tx below re-validates under a row lock, so this non-locking read is TOCTOU-safe.
    const [pre] = await ctx.db
      .select()
      .from(passwordResets)
      .where(eq(passwordResets.tokenHash, tokenHash))
      .limit(1)

    if (!pre || pre.usedAt !== null) {
      return err('invalid_token')
    }
    if (Date.parse(pre.expiresAt) < Date.now()) {
      return err('token_expired')
    }

    // Hash outside the tx so argon2 isn't spent holding the row lock.
    const newPasswordHash = (await Bun.password.hash(
      newPassword,
      PASSWORD_HASH_OPTIONS
    )) as HashedPassword

    // Single tx with a row lock: consume the token, rotate the password, and revoke
    // every session together. A reset proves control of the inbox, so it also verifies
    // the email and clears any brute-force lockout (the owner has regained access).
    return await ctx.db.transaction(async (tx) => {
      // FOR UPDATE serialises concurrent resets of the same token: the second request
      // blocks until the first commits, then re-reads used_at set → invalid_token.
      // Without the lock both could pass the single-use guard and rotate the password.
      const [row] = await tx
        .select()
        .from(passwordResets)
        .where(eq(passwordResets.tokenHash, tokenHash))
        .for('update')
        .limit(1)

      if (!row || row.usedAt !== null) {
        return err('invalid_token')
      }

      if (Date.parse(row.expiresAt) < Date.now()) {
        return err('token_expired')
      }

      await tx
        .update(passwordResets)
        .set({ usedAt: sql`now()` })
        .where(eq(passwordResets.id, row.id))

      await tx
        .update(users)
        .set({
          passwordHash: newPasswordHash,
          updatedAt: sql`now()`,
          emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())`,
          failedLoginAttempts: 0,
          lockedUntil: null,
        })
        .where(eq(users.id, row.userId))

      await revokeAllUserRefreshTokens(ctx.db, row.userId, tx)

      return ok(null)
    })
  } catch (e) {
    logger.error({ err: e }, 'Password reset failed')
    return err('server_error')
  }
}
