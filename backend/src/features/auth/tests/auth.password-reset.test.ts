import { describe, expect, it, spyOn } from 'bun:test'

import { and, eq, isNull } from 'drizzle-orm'

import { passwordResets, users } from '../../../db/schema'
import { setupDbTests } from '../../../tests/db-setup'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { unsafePassword } from '../../../tests/helpers/unsafe'
import {
  createPasswordResetToken,
  requestPasswordReset,
  resetPassword,
} from '../password-reset.service'
import { login, refresh } from '../service'
import { createCtx, testDb } from './auth-test.setup'

setupDbTests()

const NEW_PASSWORD = unsafePassword('NouveauPass123!')

async function userRow(email: string) {
  const [row] = await testDb.select().from(users).where(eq(users.email, email))
  return row
}

async function activeResetTokens(userId: string) {
  return testDb
    .select()
    .from(passwordResets)
    .where(and(eq(passwordResets.userId, userId), isNull(passwordResets.usedAt)))
}

// forgot-password is enumeration-safe (ADR 0010): the response is an identical
// neutral `{ pending: true }` with no session whether the email exists or not; the
// reset link reaches only the address owner, by email. These tests are the guard.
describe('requestPasswordReset', () => {
  it('renvoie une réponse neutre pending pour un email inconnu, sans session', async () => {
    const result = await requestPasswordReset(createCtx(), TEST_CREDENTIALS.invalide.emailInconnu)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data).toEqual({ pending: true })
    const data = result.data as Record<string, unknown>
    expect(data.accessToken).toBeUndefined()
    expect(data.refreshToken).toBeUndefined()
  })

  it("renvoie la MÊME réponse neutre pour un email existant (guard d'énumération)", async () => {
    // alice is never created → unknown-email branch.
    const unknown = await requestPasswordReset(createCtx(), TEST_CREDENTIALS.alice.email)

    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)
    const existing = await requestPasswordReset(createCtx(), creds.email)

    // Byte-identical: no code, status, or shape difference between the branches.
    expect(existing).toEqual(unknown)
    expect(existing.success).toBe(true)
  })

  it('crée un token de reset pour un email existant', async () => {
    const creds = TEST_CREDENTIALS.toto
    const user = await createTestUser(creds.rawEmail, creds.rawPassword)

    await requestPasswordReset(createCtx(), creds.email)

    expect((await activeResetTokens(user.id)).length).toBe(1)
  })

  it('ne crée aucun token de reset pour un email inconnu', async () => {
    await requestPasswordReset(createCtx(), TEST_CREDENTIALS.invalide.emailInconnu)

    const all = await testDb.select().from(passwordResets)
    expect(all.length).toBe(0)
  })

  it('détecte un email existant quelle que soit la casse', async () => {
    const creds = TEST_CREDENTIALS.toto
    const user = await createTestUser(creds.rawEmail, creds.rawPassword)

    await requestPasswordReset(createCtx(), TEST_CREDENTIALS.totoVariants.majuscules)

    expect((await activeResetTokens(user.id)).length).toBe(1)
  })

  it('ne greffe pas de mot de passe sur un compte Google-only (réponse neutre, aucun token)', async () => {
    // OAuth-only account, like google.service.ts: googleSub set, passwordHash null.
    const [gUser] = await testDb
      .insert(users)
      .values({
        email: 'google-only@exemple.fr',
        passwordHash: null,
        googleSub: 'google-sub-test-xyz',
        emailVerifiedAt: new Date().toISOString(),
      })
      .returning()
    expect(gUser).toBeDefined()
    if (!gUser) return

    const result = await requestPasswordReset(createCtx(), 'google-only@exemple.fr')

    // Same neutral shape as the unknown-email branch — no existence leak.
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual({ pending: true })
    // No reset token grafted onto the OAuth-only account.
    expect((await activeResetTokens(gUser.id)).length).toBe(0)
  })

  it('deux requêtes forgot concurrentes ne laissent quʼun seul token actif (index partiel)', async () => {
    const creds = TEST_CREDENTIALS.toto
    const user = await createTestUser(creds.rawEmail, creds.rawPassword)

    await Promise.all([
      requestPasswordReset(createCtx(), creds.email),
      requestPasswordReset(createCtx(), creds.email),
    ])

    // The partial unique index makes the loser's INSERT fail (swallowed best-effort) → 1 active.
    expect((await activeResetTokens(user.id)).length).toBe(1)
  })
})

describe('createPasswordResetToken', () => {
  it('génère un token raw de 64 caractères', async () => {
    const creds = TEST_CREDENTIALS.toto
    const user = await createTestUser(creds.rawEmail, creds.rawPassword)

    const token = await createPasswordResetToken(testDb, user.id)
    expect(token).toBeString()
    expect(token.length).toBe(64)
  })

  it('stocke le hash du token, pas le raw', async () => {
    const creds = TEST_CREDENTIALS.toto
    const user = await createTestUser(creds.rawEmail, creds.rawPassword)

    const token = await createPasswordResetToken(testDb, user.id)
    const [row] = await activeResetTokens(user.id)

    expect(row).toBeDefined()
    expect(row?.tokenHash).not.toBe(token)
  })

  it('invalide les anciens tokens non utilisés du même user', async () => {
    const creds = TEST_CREDENTIALS.toto
    const user = await createTestUser(creds.rawEmail, creds.rawPassword)

    await createPasswordResetToken(testDb, user.id)
    await createPasswordResetToken(testDb, user.id)

    expect((await activeResetTokens(user.id)).length).toBe(1)
  })

  it('définit expiresAt à ~1h dans le futur', async () => {
    const creds = TEST_CREDENTIALS.toto
    const user = await createTestUser(creds.rawEmail, creds.rawPassword)

    const before = Date.now()
    await createPasswordResetToken(testDb, user.id)
    const after = Date.now()

    const [row] = await activeResetTokens(user.id)
    const expiry = row?.expiresAt ? new Date(row.expiresAt).getTime() : undefined
    expect(expiry).toBeGreaterThan(before + 59 * 60 * 1000)
    expect(expiry).toBeLessThanOrEqual(after + 60 * 60 * 1000 + 1000)
  })
})

describe('resetPassword', () => {
  it("change le mot de passe : l'ancien est rejeté, le nouveau accepté", async () => {
    const creds = TEST_CREDENTIALS.toto
    const user = await createTestUser(creds.rawEmail, creds.rawPassword)
    const token = await createPasswordResetToken(testDb, user.id)

    const result = await resetPassword(createCtx(), token, NEW_PASSWORD)
    expect(result.success).toBe(true)

    const withOld = await login(createCtx(), creds.email, creds.password)
    expect(withOld.success).toBe(false)
    if (!withOld.success) expect(withOld.error).toBe('invalid_credentials')

    const withNew = await login(createCtx(), creds.email, NEW_PASSWORD)
    expect(withNew.success).toBe(true)
  })

  it('marque le token comme utilisé', async () => {
    const creds = TEST_CREDENTIALS.toto
    const user = await createTestUser(creds.rawEmail, creds.rawPassword)
    const token = await createPasswordResetToken(testDb, user.id)

    await resetPassword(createCtx(), token, NEW_PASSWORD)

    expect((await activeResetTokens(user.id)).length).toBe(0)
  })

  it('sérialise deux resets concurrents du même token (un seul réussit)', async () => {
    const creds = TEST_CREDENTIALS.toto
    const user = await createTestUser(creds.rawEmail, creds.rawPassword)
    const token = await createPasswordResetToken(testDb, user.id)

    const [a, b] = await Promise.all([
      resetPassword(createCtx(), token, NEW_PASSWORD),
      resetPassword(createCtx(), token, unsafePassword('AutrePass456!')),
    ])

    expect([a, b].filter((r) => r.success).length).toBe(1)
    const failure = [a, b].find((r) => !r.success)
    if (failure && !failure.success) expect(failure.error).toBe('invalid_token')

    // Token consumed exactly once.
    expect((await activeResetTokens(user.id)).length).toBe(0)
  })

  it('retourne invalid_token pour un token inconnu', async () => {
    const result = await resetPassword(createCtx(), 'a'.repeat(64), NEW_PASSWORD)
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBe('invalid_token')
  })

  it("ne hashe pas le mot de passe pour un token invalide (garde l'amplification argon2)", async () => {
    const hashSpy = spyOn(Bun.password, 'hash')
    try {
      const result = await resetPassword(createCtx(), 'b'.repeat(64), NEW_PASSWORD)
      expect(result.success).toBe(false)
      if (!result.success) expect(result.error).toBe('invalid_token')
      // Bogus token is rejected by the cheap pre-check before argon2 ever runs.
      expect(hashSpy).not.toHaveBeenCalled()
    } finally {
      hashSpy.mockRestore()
    }
  })

  it('retourne invalid_token pour un token déjà utilisé', async () => {
    const creds = TEST_CREDENTIALS.toto
    const user = await createTestUser(creds.rawEmail, creds.rawPassword)
    const token = await createPasswordResetToken(testDb, user.id)

    await resetPassword(createCtx(), token, NEW_PASSWORD)
    const second = await resetPassword(createCtx(), token, NEW_PASSWORD)

    expect(second.success).toBe(false)
    if (second.success) return
    expect(second.error).toBe('invalid_token')
  })

  it('retourne token_expired pour un token expiré', async () => {
    const creds = TEST_CREDENTIALS.toto
    const user = await createTestUser(creds.rawEmail, creds.rawPassword)
    const token = await createPasswordResetToken(testDb, user.id)

    await testDb
      .update(passwordResets)
      .set({ expiresAt: new Date(Date.now() - 1000).toISOString() })
      .where(eq(passwordResets.userId, user.id))

    const result = await resetPassword(createCtx(), token, NEW_PASSWORD)
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBe('token_expired')
  })

  it("révoque les sessions existantes (l'ancien refresh token devient invalide)", async () => {
    const creds = TEST_CREDENTIALS.toto
    const user = await createTestUser(creds.rawEmail, creds.rawPassword)

    const loggedIn = await login(createCtx(), creds.email, creds.password)
    expect(loggedIn.success).toBe(true)
    if (!loggedIn.success) return
    const oldRefresh = loggedIn.data.refreshToken

    const token = await createPasswordResetToken(testDb, user.id)
    await resetPassword(createCtx(), token, NEW_PASSWORD)

    const refreshed = await refresh(createCtx(), oldRefresh)
    expect(refreshed.success).toBe(false)
    if (refreshed.success) return
    expect(refreshed.error).toBe('invalid_token')
  })

  it("vérifie l'email (preuve de contrôle de la boîte) s'il ne l'était pas", async () => {
    const creds = TEST_CREDENTIALS.toto
    const user = await createTestUser(creds.rawEmail, creds.rawPassword)
    expect((await userRow(creds.rawEmail))?.emailVerifiedAt).toBeNull()

    const token = await createPasswordResetToken(testDb, user.id)
    await resetPassword(createCtx(), token, NEW_PASSWORD)

    expect((await userRow(creds.rawEmail))?.emailVerifiedAt).not.toBeNull()
  })

  it('lève le verrouillage brute-force après un reset réussi', async () => {
    const creds = TEST_CREDENTIALS.toto
    const user = await createTestUser(creds.rawEmail, creds.rawPassword)
    await testDb
      .update(users)
      .set({ failedLoginAttempts: 5, lockedUntil: new Date(Date.now() + 60_000).toISOString() })
      .where(eq(users.id, user.id))

    const token = await createPasswordResetToken(testDb, user.id)
    await resetPassword(createCtx(), token, NEW_PASSWORD)

    const row = await userRow(creds.rawEmail)
    expect(row?.failedLoginAttempts).toBe(0)
    expect(row?.lockedUntil).toBeNull()
  })
})
