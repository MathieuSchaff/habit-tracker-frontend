import { describe, expect, it } from 'bun:test'

import { eq } from 'drizzle-orm'

import { JWT_SECRET, REFRESH_SECRET } from '../../../tests/helpers/secrets'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { verifyAccessToken, verifyRefreshToken } from '../jwt.utils'
import { findValidRefreshToken } from '../refresh-token.service'
import { signup } from '../service'
import { createCtx, testDb } from './auth-test.setup'

describe('signup', () => {
  it('devrait inscrire Toto avec des identifiants valides', async () => {
    const creds = TEST_CREDENTIALS.toto

    const result = await signup(createCtx(), creds.email, creds.password)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.user.email).toBe(creds.rawEmail)
    expect(result.data.accessToken).toBeDefined()
    expect(result.data.refreshToken).toBeDefined()
  })

  it('devrait inscrire Alice avec des identifiants valides', async () => {
    const creds = TEST_CREDENTIALS.alice

    const result = await signup(createCtx(), creds.email, creds.password)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.user.email).toBe(creds.rawEmail)
  })

  it("devrait inscrire Jean-Michel (nom composé dans l'email)", async () => {
    const creds = TEST_CREDENTIALS.jeanmichel

    const result = await signup(createCtx(), creds.email, creds.password)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.user.email).toBe(creds.rawEmail)
  })

  it("devrait retourner un access token JWT valide à l'inscription", async () => {
    const creds = TEST_CREDENTIALS.toto

    const result = await signup(createCtx(), creds.email, creds.password)
    if (!result.success) return

    const payload = await verifyAccessToken(result.data.accessToken, JWT_SECRET)
    expect(payload).not.toBeNull()
    if (!payload) return
    expect(payload.sub).toBe(result.data.user.id)
    expect(payload.type).toBe('access')
  })

  it("devrait stocker le refresh token en base à l'inscription", async () => {
    const creds = TEST_CREDENTIALS.toto

    const result = await signup(createCtx(), creds.email, creds.password)
    if (!result.success) return

    const refreshPayload = await verifyRefreshToken(result.data.refreshToken, REFRESH_SECRET)
    expect(refreshPayload).not.toBeNull()
    if (!refreshPayload) return

    const stored = await findValidRefreshToken(testDb, refreshPayload.jti)
    expect(stored).not.toBeNull()
    if (!stored) return
    expect(stored.userId).toBe(result.data.user.id)
  })

  it("devrait normaliser l'email à l'inscription (majuscules)", async () => {
    const result = await signup(
      createCtx(),
      TEST_CREDENTIALS.totoVariants.majuscules,
      TEST_CREDENTIALS.toto.password
    )

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.user.email).toBe(TEST_CREDENTIALS.toto.rawEmail)
  })

  it("devrait normaliser l'email à l'inscription (espaces)", async () => {
    const result = await signup(
      createCtx(),
      TEST_CREDENTIALS.totoVariants.avecEspaces,
      TEST_CREDENTIALS.toto.password
    )

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.user.email).toBe(TEST_CREDENTIALS.toto.rawEmail)
  })

  it("devrait normaliser l'email à l'inscription (casse mélangée)", async () => {
    const result = await signup(
      createCtx(),
      TEST_CREDENTIALS.totoVariants.casseMelangee,
      TEST_CREDENTIALS.toto.password
    )

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.user.email).toBe(TEST_CREDENTIALS.toto.rawEmail)
  })

  it("devrait échouer si l'email existe déjà", async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const result = await signup(createCtx(), creds.email, creds.password)

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBe('email_exists')
  })

  it('devrait détecter un doublon même avec une casse différente (majuscules)', async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const result = await signup(
      createCtx(),
      TEST_CREDENTIALS.totoVariants.majuscules,
      creds.password
    )

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBe('email_exists')
  })

  it('devrait détecter un doublon même avec des espaces autour', async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const result = await signup(
      createCtx(),
      TEST_CREDENTIALS.totoVariants.avecEspaces,
      creds.password
    )

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBe('email_exists')
  })

  it('devrait détecter un doublon même avec une casse mélangée', async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const result = await signup(
      createCtx(),
      TEST_CREDENTIALS.totoVariants.casseMelangee,
      creds.password
    )

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBe('email_exists')
  })

  it("devrait enregistrer l'IP et le UserAgent à l'inscription", async () => {
    const creds = TEST_CREDENTIALS.toto

    const result = await signup(
      createCtx({ ip: '10.0.0.1', userAgent: 'SignupBrowser/1.0' }),
      creds.email,
      creds.password
    )

    expect(result.success).toBe(true)
    if (!result.success) return

    const refreshPayload = await verifyRefreshToken(result.data.refreshToken, REFRESH_SECRET)
    if (!refreshPayload) return

    const stored = await findValidRefreshToken(testDb, refreshPayload.jti)
    if (!stored) return
    expect(stored.ip).toBe('10.0.0.1')
    expect(stored.userAgent).toBe('SignupBrowser/1.0')
  })

  it('devrait stocker null pour IP et UserAgent quand non fournis', async () => {
    const creds = TEST_CREDENTIALS.toto

    const result = await signup(createCtx(), creds.email, creds.password)
    if (!result.success) return

    const refreshPayload = await verifyRefreshToken(result.data.refreshToken, REFRESH_SECRET)
    if (!refreshPayload) return

    const stored = await findValidRefreshToken(testDb, refreshPayload.jti)
    if (!stored) return
    expect(stored.ip).toBeNull()
    expect(stored.userAgent).toBeNull()
  })

  it('devrait retourner un objet user public sans passwordHash', async () => {
    const creds = TEST_CREDENTIALS.toto

    const result = await signup(createCtx(), creds.email, creds.password)
    if (!result.success) return

    const user = result.data.user as Record<string, unknown>
    expect(user.id).toBeDefined()
    expect(user.email).toBeDefined()
    expect(user.createdAt).toBeDefined()
    expect(user).not.toHaveProperty('passwordHash')
    expect(user).not.toHaveProperty('password')
  })

  it('devrait inscrire plusieurs utilisateurs indépendamment', async () => {
    const toto = TEST_CREDENTIALS.toto
    const alice = TEST_CREDENTIALS.alice
    const jm = TEST_CREDENTIALS.jeanmichel

    const r1 = await signup(createCtx(), toto.email, toto.password)
    const r2 = await signup(createCtx(), alice.email, alice.password)
    const r3 = await signup(createCtx(), jm.email, jm.password)

    expect(r1.success).toBe(true)
    expect(r2.success).toBe(true)
    expect(r3.success).toBe(true)
    if (!r1.success || !r2.success || !r3.success) return

    expect(r1.data.user.id).not.toBe(r2.data.user.id)
    expect(r2.data.user.id).not.toBe(r3.data.user.id)
    expect(r1.data.user.email).toBe(toto.rawEmail)
    expect(r2.data.user.email).toBe(alice.rawEmail)
    expect(r3.data.user.email).toBe(jm.rawEmail)
  })

  it("devrait créer un token de vérification en base après l'inscription", async () => {
    const { emailVerifications } = await import('../../../db/schema')
    const creds = TEST_CREDENTIALS.toto

    const result = await signup(createCtx(), creds.email, creds.password)
    if (!result.success) return

    const [row] = await testDb
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.userId, result.data.user.id))

    expect(row).toBeDefined()
    expect(row?.usedAt).toBeNull()
  })

  it("devrait retourner emailVerified: false après l'inscription", async () => {
    const creds = TEST_CREDENTIALS.toto

    const result = await signup(createCtx(), creds.email, creds.password)
    if (!result.success) return

    expect(result.data.user.emailVerified).toBe(false)
  })
})
