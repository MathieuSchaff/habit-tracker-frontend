import { describe, expect, it } from 'bun:test'

import { REFRESH_SECRET } from '../../../tests/helpers/secrets'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { verifyRefreshToken } from '../jwt.utils'
import { findValidRefreshToken } from '../refresh-token.service'
import { login, logout } from '../service'
import { createCtx, testDb } from './auth-test.setup'

describe('logout', () => {
  it('devrait révoquer le refresh token au logout', async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const loginResult = await login(createCtx(), creds.email, creds.password)
    expect(loginResult.success).toBe(true)
    if (!loginResult.success) return

    const result = await logout(createCtx(), loginResult.data.refreshToken)
    expect(result.success).toBe(true)

    const refreshPayload = await verifyRefreshToken(loginResult.data.refreshToken, REFRESH_SECRET)
    if (!refreshPayload) return

    const stored = await findValidRefreshToken(testDb, refreshPayload.jti)
    expect(stored).toBeNull()
  })

  it('devrait gérer un double logout gracieusement', async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const loginResult = await login(createCtx(), creds.email, creds.password)
    expect(loginResult.success).toBe(true)
    if (!loginResult.success) return

    const result1 = await logout(createCtx(), loginResult.data.refreshToken)
    expect(result1.success).toBe(true)

    const result2 = await logout(createCtx(), loginResult.data.refreshToken)
    expect(result2.success).toBe(true)
  })

  it('devrait gérer un logout avec un token invalide', async () => {
    const result = await logout(createCtx(), 'token.completement.invalide')
    expect(result.success).toBe(true)
  })

  it('devrait gérer un logout avec un token vide', async () => {
    const result = await logout(createCtx(), '')
    expect(result.success).toBe(true)
  })

  it("ne devrait pas affecter les autres sessions au logout d'un seul appareil", async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const login1 = await login(
      createCtx({ ip: '192.168.1.1', userAgent: 'Appareil1' }),
      creds.email,
      creds.password
    )
    const login2 = await login(
      createCtx({ ip: '192.168.1.2', userAgent: 'Appareil2' }),
      creds.email,
      creds.password
    )

    expect(login1.success).toBe(true)
    expect(login2.success).toBe(true)
    if (!login1.success || !login2.success) return

    await logout(createCtx(), login1.data.refreshToken)

    const p1 = await verifyRefreshToken(login1.data.refreshToken, REFRESH_SECRET)
    const p2 = await verifyRefreshToken(login2.data.refreshToken, REFRESH_SECRET)

    if (p1) {
      const s1 = await findValidRefreshToken(testDb, p1.jti)
      expect(s1).toBeNull()
    }

    if (!p2) return
    const s2 = await findValidRefreshToken(testDb, p2.jti)
    expect(s2).not.toBeNull()
  })

  it("ne devrait pas affecter les sessions d'un autre utilisateur", async () => {
    const toto = TEST_CREDENTIALS.toto
    const alice = TEST_CREDENTIALS.alice
    await createTestUser(toto.rawEmail, toto.rawPassword)
    await createTestUser(alice.rawEmail, alice.rawPassword)

    const loginToto = await login(createCtx(), toto.email, toto.password)
    const loginAlice = await login(createCtx(), alice.email, alice.password)

    expect(loginToto.success).toBe(true)
    expect(loginAlice.success).toBe(true)
    if (!loginToto.success || !loginAlice.success) return

    await logout(createCtx(), loginToto.data.refreshToken)

    const pAlice = await verifyRefreshToken(loginAlice.data.refreshToken, REFRESH_SECRET)
    if (!pAlice) return
    const sAlice = await findValidRefreshToken(testDb, pAlice.jti)
    expect(sAlice).not.toBeNull()
  })

  it('devrait pouvoir se reconnecter après un logout', async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const loginResult = await login(createCtx(), creds.email, creds.password)
    if (!loginResult.success) return

    await logout(createCtx(), loginResult.data.refreshToken)

    const reloginResult = await login(createCtx(), creds.email, creds.password)
    expect(reloginResult.success).toBe(true)
    if (!reloginResult.success) return
    expect(reloginResult.data.user.email).toBe(creds.rawEmail)
    expect(reloginResult.data.accessToken).toBeDefined()
    expect(reloginResult.data.refreshToken).toBeDefined()
  })
})
