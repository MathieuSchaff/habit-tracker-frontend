import { describe, expect, it } from 'bun:test'

import { eq } from 'drizzle-orm'

import { JWT_SECRET, REFRESH_SECRET } from '../../../tests/helpers/secrets'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { verifyAccessToken, verifyRefreshToken } from '../jwt.utils'
import { findValidRefreshToken } from '../refresh-token.service'
import { login } from '../service'
// import { unsafeEmail, unsafePassword } from '../../../tests/helpers/unsafe'
import { createCtx, testDb } from './auth-test.setup'

describe('login', () => {
  it('devrait connecter Toto avec ses identifiants valides', async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const result = await login(createCtx(), creds.email, creds.password)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.user.email).toBe(creds.rawEmail)
    expect(result.data.accessToken).toBeDefined()
    expect(result.data.refreshToken).toBeDefined()
  })

  it('devrait connecter Alice avec ses identifiants valides', async () => {
    const creds = TEST_CREDENTIALS.alice
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const result = await login(createCtx(), creds.email, creds.password)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.user.email).toBe(creds.rawEmail)
  })

  it('devrait retourner un access token JWT valide avec le bon sub et type', async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const result = await login(createCtx(), creds.email, creds.password)
    if (!result.success) return

    const payload = await verifyAccessToken(result.data.accessToken, JWT_SECRET)
    expect(payload).not.toBeNull()
    if (!payload) return
    expect(payload.sub).toBe(result.data.user.id)
    expect(payload.type).toBe('access')
  })

  it('devrait stocker le refresh token en base de données', async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const result = await login(createCtx(), creds.email, creds.password)
    if (!result.success) return

    const refreshPayload = await verifyRefreshToken(result.data.refreshToken, REFRESH_SECRET)
    expect(refreshPayload).not.toBeNull()
    if (!refreshPayload) return

    const stored = await findValidRefreshToken(testDb, refreshPayload.jti)
    expect(stored).not.toBeNull()
    if (!stored) return
    expect(stored.userId).toBe(result.data.user.id)
  })

  it('devrait retourner un refresh token JWT valide avec un jti', async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const result = await login(createCtx(), creds.email, creds.password)
    if (!result.success) return

    const refreshPayload = await verifyRefreshToken(result.data.refreshToken, REFRESH_SECRET)
    expect(refreshPayload).not.toBeNull()
    if (!refreshPayload) return
    expect(refreshPayload.jti).toBeDefined()
    expect(refreshPayload.sub).toBe(result.data.user.id)
  })

  it("devrait normaliser l'email de Toto (majuscules, espaces, casse mélangée)", async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const variantes = [
      TEST_CREDENTIALS.totoVariants.majuscules,
      TEST_CREDENTIALS.totoVariants.avecEspaces,
      TEST_CREDENTIALS.totoVariants.casseMelangee,
    ]

    for (const email of variantes) {
      const result = await login(createCtx(), email, creds.password)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.user.email).toBe(creds.rawEmail)
      }
    }
  })

  it('devrait échouer avec un email inconnu', async () => {
    const result = await login(
      createCtx(),
      TEST_CREDENTIALS.invalide.emailInconnu,
      TEST_CREDENTIALS.toto.password
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('invalid_credentials')
    }
  })

  it('devrait échouer avec un mauvais mot de passe', async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const result = await login(
      createCtx(),
      creds.email,
      TEST_CREDENTIALS.invalide.mauvaisMotDePasse
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('invalid_credentials')
    }
  })

  it('devrait échouer avec un email vide', async () => {
    const result = await login(
      createCtx(),
      TEST_CREDENTIALS.invalide.videEmail,
      TEST_CREDENTIALS.toto.password
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('invalid_credentials')
    }
  })

  it('devrait échouer avec un mot de passe vide', async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const result = await login(createCtx(), creds.email, TEST_CREDENTIALS.invalide.videMotDePasse)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('invalid_credentials')
    }
  })

  it('devrait échouer avec email et mot de passe tous les deux vides', async () => {
    const result = await login(
      createCtx(),
      TEST_CREDENTIALS.invalide.videEmail,
      TEST_CREDENTIALS.invalide.videMotDePasse
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('invalid_credentials')
    }
  })

  it("devrait échouer avec le bon email mais le mot de passe d'un autre utilisateur", async () => {
    const toto = TEST_CREDENTIALS.toto
    const alice = TEST_CREDENTIALS.alice
    await createTestUser(toto.rawEmail, toto.rawPassword)
    await createTestUser(alice.rawEmail, alice.rawPassword)

    const result = await login(createCtx(), toto.email, alice.password)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('invalid_credentials')
    }
  })

  it('devrait retourner la même erreur pour email inconnu et mauvais mot de passe (timing-safe)', async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const resultBadEmail = await login(
      createCtx(),
      TEST_CREDENTIALS.invalide.emailInconnu,
      creds.password
    )
    const resultBadPassword = await login(
      createCtx(),
      creds.email,
      TEST_CREDENTIALS.invalide.mauvaisMotDePasse
    )

    expect(resultBadEmail.success).toBe(false)
    expect(resultBadPassword.success).toBe(false)
    if (!resultBadEmail.success && !resultBadPassword.success) {
      expect(resultBadEmail.error).toBe(resultBadPassword.error)
      expect(resultBadEmail.error).toBe('invalid_credentials')
    }
  })

  it("devrait enregistrer l'IP et le UserAgent avec le refresh token", async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const result = await login(
      createCtx({ ip: '192.168.1.1', userAgent: 'TestBrowser/1.0' }),
      creds.email,
      creds.password
    )

    expect(result.success).toBe(true)
    if (!result.success) return

    const refreshPayload = await verifyRefreshToken(result.data.refreshToken, REFRESH_SECRET)
    if (!refreshPayload) return
    const stored = await findValidRefreshToken(testDb, refreshPayload.jti)
    if (!stored) return
    expect(stored.ip).toBe('192.168.1.1')
    expect(stored.userAgent).toBe('TestBrowser/1.0')
  })

  it('devrait stocker null pour IP et UserAgent quand non fournis', async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const result = await login(createCtx(), creds.email, creds.password)

    expect(result.success).toBe(true)
    if (!result.success) return

    const refreshPayload = await verifyRefreshToken(result.data.refreshToken, REFRESH_SECRET)
    if (!refreshPayload) return
    const stored = await findValidRefreshToken(testDb, refreshPayload.jti)
    if (!stored) return
    expect(stored.ip).toBeNull()
    expect(stored.userAgent).toBeNull()
  })

  it('devrait générer des tokens différents à chaque login', async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const result1 = await login(createCtx(), creds.email, creds.password)
    const result2 = await login(createCtx(), creds.email, creds.password)

    if (!result1.success || !result2.success) return
    expect(result1.data.accessToken).not.toBe(result2.data.accessToken)
    expect(result1.data.refreshToken).not.toBe(result2.data.refreshToken)
  })

  it('devrait retourner le même userId à chaque login', async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const result1 = await login(createCtx(), creds.email, creds.password)
    const result2 = await login(createCtx(), creds.email, creds.password)

    if (!result1.success || !result2.success) return
    expect(result1.data.user.id).toBe(result2.data.user.id)
  })

  it('devrait retourner un objet user public sans le passwordHash', async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const result = await login(createCtx(), creds.email, creds.password)
    if (!result.success) return

    const user = result.data.user as Record<string, unknown>
    expect(user.id).toBeDefined()
    expect(user.email).toBeDefined()
    expect(user.createdAt).toBeDefined()
    expect(user).not.toHaveProperty('passwordHash')
    expect(user).not.toHaveProperty('password')
  })

  it('devrait connecter deux utilisateurs différents indépendamment', async () => {
    const toto = TEST_CREDENTIALS.toto
    const alice = TEST_CREDENTIALS.alice
    await createTestUser(toto.rawEmail, toto.rawPassword)
    await createTestUser(alice.rawEmail, alice.rawPassword)

    const resultToto = await login(createCtx(), toto.email, toto.password)
    const resultAlice = await login(createCtx(), alice.email, alice.password)

    expect(resultToto.success).toBe(true)
    expect(resultAlice.success).toBe(true)
    if (!resultToto.success || !resultAlice.success) return
    expect(resultToto.data.user.email).toBe(toto.rawEmail)
    expect(resultAlice.data.user.email).toBe(alice.rawEmail)
    expect(resultToto.data.user.id).not.toBe(resultAlice.data.user.id)
  })

  it('devrait autoriser le login si email non vérifié dans les 24h (grace period)', async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const result = await login(createCtx(), creds.email, creds.password)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.user.emailVerified).toBe(false)
  })

  it('devrait bloquer le login si email non vérifié après 24h', async () => {
    const { users: usersTable } = await import('../../../db/schema')
    const creds = TEST_CREDENTIALS.toto
    const created = await createTestUser(creds.rawEmail, creds.rawPassword)

    await testDb
      .update(usersTable)
      .set({ createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) })
      .where(eq(usersTable.id, created.id))

    const result = await login(createCtx(), creds.email, creds.password)

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBe('email_not_verified')
  })

  it('devrait autoriser le login si email vérifié même après 24h', async () => {
    const { users: usersTable } = await import('../../../db/schema')
    const creds = TEST_CREDENTIALS.toto
    const created = await createTestUser(creds.rawEmail, creds.rawPassword)

    await testDb
      .update(usersTable)
      .set({
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        emailVerifiedAt: new Date(),
      })
      .where(eq(usersTable.id, created.id))

    const result = await login(createCtx(), creds.email, creds.password)
    expect(result.success).toBe(true)
  })
})
