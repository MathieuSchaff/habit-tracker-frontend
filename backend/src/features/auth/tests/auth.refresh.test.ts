import { describe, expect, it } from 'bun:test'

import type { Email, RawPassword } from '@habit-tracker/shared'

import { eq } from 'drizzle-orm'

import { JWT_SECRET, REFRESH_SECRET } from '../../../tests/helpers/secrets'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '../jwt.utils'
import { findValidRefreshToken } from '../refresh-token.service'
import { login, refresh } from '../service'
import { createCtx, testDb } from './auth-test.setup'

async function connecterEtRecupererTokens(
  rawEmail: string,
  rawPassword: string,
  ctx?: Parameters<typeof createCtx>[0]
) {
  const result = await login(
    createCtx({ ip: '127.0.0.1', userAgent: 'TestBrowser/1.0', ...ctx }),
    rawEmail as unknown as Email,
    rawPassword as unknown as RawPassword
  )
  if (!result.success) throw new Error(`Login échoué pour ${rawEmail}`)
  return result.data
}

describe('refresh', () => {
  it('devrait faire une rotation de tokens avec succès', async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)
    const { refreshToken: ancienRefresh } = await connecterEtRecupererTokens(
      creds.rawEmail,
      creds.rawPassword
    )

    const result = await refresh(
      createCtx({ ip: '192.168.1.1', userAgent: 'TestBrowser/1.0' }),
      ancienRefresh
    )

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.accessToken).toBeDefined()
    expect(result.data.refreshToken).toBeDefined()
    expect(result.data.refreshToken).not.toBe(ancienRefresh)
  })

  it('devrait générer un nouvel access token valide après refresh', async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)
    const { refreshToken, user } = await connecterEtRecupererTokens(
      creds.rawEmail,
      creds.rawPassword
    )

    const result = await refresh(createCtx({ ip: '127.0.0.1', userAgent: 'Test' }), refreshToken)
    if (!result.success) return

    const payload = await verifyAccessToken(result.data.accessToken, JWT_SECRET)
    expect(payload).not.toBeNull()
    if (!payload) return
    expect(payload.sub).toBe(user.id)
    expect(payload.type).toBe('access')
  })

  it('devrait stocker le nouveau refresh token en base avec IP et UserAgent', async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)
    const { refreshToken } = await connecterEtRecupererTokens(creds.rawEmail, creds.rawPassword)

    const result = await refresh(
      createCtx({ ip: '192.168.1.1', userAgent: 'NouveauBrowser/2.0' }),
      refreshToken
    )
    if (!result.success) return

    const newPayload = await verifyRefreshToken(result.data.refreshToken, REFRESH_SECRET)
    expect(newPayload).not.toBeNull()
    if (!newPayload) return

    const stored = await findValidRefreshToken(testDb, newPayload.jti)
    expect(stored).not.toBeNull()
    if (!stored) return
    expect(stored.ip).toBe('192.168.1.1')
    expect(stored.userAgent).toBe('NouveauBrowser/2.0')
  })

  it("devrait révoquer l'ancien refresh token après rotation", async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)
    const { refreshToken } = await connecterEtRecupererTokens(creds.rawEmail, creds.rawPassword)

    const oldPayload = await verifyRefreshToken(refreshToken, REFRESH_SECRET)
    if (!oldPayload) return

    await refresh(createCtx({ ip: '127.0.0.1', userAgent: 'Test' }), refreshToken)

    const oldStored = await findValidRefreshToken(testDb, oldPayload.jti)
    expect(oldStored).toBeNull()
  })

  it("devrait détecter une attaque par replay et révoquer tous les tokens de l'utilisateur", async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)
    const { refreshToken: tokenVole } = await connecterEtRecupererTokens(
      creds.rawEmail,
      creds.rawPassword
    )

    const refreshResult = await refresh(
      createCtx({ ip: '127.0.0.1', userAgent: 'NavigateurLegitime' }),
      tokenVole
    )
    expect(refreshResult.success).toBe(true)

    const replayResult = await refresh(
      createCtx({ ip: '10.0.0.1', userAgent: 'NavigateurMalveillant' }),
      tokenVole
    )
    expect(replayResult.success).toBe(false)
    if (!replayResult.success) {
      expect(replayResult.error).toBe('invalid_token')
    }

    if (refreshResult.success) {
      const newPayload = await verifyRefreshToken(refreshResult.data.refreshToken, REFRESH_SECRET)
      if (!newPayload) return

      const newStored = await findValidRefreshToken(testDb, newPayload.jti)
      expect(newStored).toBeNull()
    }
  })

  it('devrait échouer avec un refresh token invalide', async () => {
    const result = await refresh(
      createCtx({ ip: '127.0.0.1', userAgent: 'Test' }),
      'token.completement.invalide'
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('invalid_token')
    }
  })

  it('devrait échouer avec un refresh token absent de la base', async () => {
    const fakeUserId = crypto.randomUUID()
    const { token } = await generateRefreshToken(fakeUserId, REFRESH_SECRET)

    const result = await refresh(createCtx({ ip: '127.0.0.1', userAgent: 'Test' }), token)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('invalid_token')
    }
  })

  it('devrait échouer avec un token vide', async () => {
    const result = await refresh(createCtx({ ip: '127.0.0.1', userAgent: 'Test' }), '')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('invalid_token')
    }
  })

  it('devrait supporter plusieurs rotations successives', async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)
    let { refreshToken: currentToken } = await connecterEtRecupererTokens(
      creds.rawEmail,
      creds.rawPassword
    )

    for (let i = 0; i < 3; i++) {
      const result = await refresh(
        createCtx({ ip: '127.0.0.1', userAgent: `Rotation${i}` }),
        currentToken
      )
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.data.refreshToken).not.toBe(currentToken)
      currentToken = result.data.refreshToken
    }

    const lastPayload = await verifyRefreshToken(currentToken, REFRESH_SECRET)
    expect(lastPayload).not.toBeNull()
    if (!lastPayload) return
    const lastStored = await findValidRefreshToken(testDb, lastPayload.jti)
    expect(lastStored).not.toBeNull()
  })

  it("ne devrait pas affecter le refresh token d'un autre utilisateur", async () => {
    const toto = TEST_CREDENTIALS.toto
    const alice = TEST_CREDENTIALS.alice
    await createTestUser(toto.rawEmail, toto.rawPassword)
    await createTestUser(alice.rawEmail, alice.rawPassword)

    const tokensToto = await connecterEtRecupererTokens(toto.rawEmail, toto.rawPassword)
    const tokensAlice = await connecterEtRecupererTokens(alice.rawEmail, alice.rawPassword)

    await refresh(createCtx({ ip: '127.0.0.1', userAgent: 'Test' }), tokensToto.refreshToken)

    const pAlice = await verifyRefreshToken(tokensAlice.refreshToken, REFRESH_SECRET)
    if (!pAlice) return
    const sAlice = await findValidRefreshToken(testDb, pAlice.jti)
    expect(sAlice).not.toBeNull()
  })

  it('devrait échouer si on tente un refresh après un logout', async () => {
    const { logout } = await import('../service')
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)
    const { refreshToken } = await connecterEtRecupererTokens(creds.rawEmail, creds.rawPassword)

    await logout(createCtx(), refreshToken)

    const result = await refresh(createCtx({ ip: '127.0.0.1', userAgent: 'Test' }), refreshToken)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('invalid_token')
    }
  })

  it('devrait bloquer le refresh si email non vérifié après 24h', async () => {
    const { users: usersTable } = await import('../../../db/schema')
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const loginResult = await login(
      createCtx({ ip: '127.0.0.1', userAgent: 'Test' }),
      creds.email as unknown as Email,
      creds.password as unknown as RawPassword
    )
    if (!loginResult.success) return

    await testDb
      .update(usersTable)
      .set({ createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) })
      .where(eq(usersTable.id, loginResult.data.user.id))

    const result = await refresh(
      createCtx({ ip: '127.0.0.1', userAgent: 'Test' }),
      loginResult.data.refreshToken
    )

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBe('email_not_verified')
  })
})
