import { describe, expect, it } from 'bun:test'

import { REFRESH_SECRET } from '../../../tests/helpers/secrets'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { verifyRefreshToken } from '../jwt.utils'
import { findValidRefreshToken, revokeAllUserRefreshTokens } from '../refresh-token.service'
import { login, logout } from '../service'
import { createCtx, testDb } from './auth-test.setup'

describe('Sessions multiples (multi-appareils)', () => {
  it('devrait permettre plusieurs refresh tokens actifs pour le même utilisateur', async () => {
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
    const login3 = await login(
      createCtx({ ip: '10.0.0.1', userAgent: 'Appareil3' }),
      creds.email,
      creds.password
    )

    expect(login1.success).toBe(true)
    expect(login2.success).toBe(true)
    expect(login3.success).toBe(true)
    if (!login1.success || !login2.success || !login3.success) return

    const p1 = await verifyRefreshToken(login1.data.refreshToken, REFRESH_SECRET)
    const p2 = await verifyRefreshToken(login2.data.refreshToken, REFRESH_SECRET)
    const p3 = await verifyRefreshToken(login3.data.refreshToken, REFRESH_SECRET)
    if (!p1 || !p2 || !p3) return

    const s1 = await findValidRefreshToken(testDb, p1.jti)
    const s2 = await findValidRefreshToken(testDb, p2.jti)
    const s3 = await findValidRefreshToken(testDb, p3.jti)

    expect(s1).not.toBeNull()
    expect(s2).not.toBeNull()
    expect(s3).not.toBeNull()
  })

  it('devrait ne révoquer que la session déconnectée, pas les autres', async () => {
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
    const login3 = await login(
      createCtx({ ip: '10.0.0.1', userAgent: 'Appareil3' }),
      creds.email,
      creds.password
    )

    expect(login1.success).toBe(true)
    expect(login2.success).toBe(true)
    expect(login3.success).toBe(true)
    if (!login1.success || !login2.success || !login3.success) return

    await logout(createCtx(), login1.data.refreshToken)

    const p1 = await verifyRefreshToken(login1.data.refreshToken, REFRESH_SECRET)
    const p2 = await verifyRefreshToken(login2.data.refreshToken, REFRESH_SECRET)
    const p3 = await verifyRefreshToken(login3.data.refreshToken, REFRESH_SECRET)

    if (p1) {
      const s1 = await findValidRefreshToken(testDb, p1.jti)
      expect(s1).toBeNull()
    }

    if (!p2 || !p3) return
    const s2 = await findValidRefreshToken(testDb, p2.jti)
    const s3 = await findValidRefreshToken(testDb, p3.jti)
    expect(s2).not.toBeNull()
    expect(s3).not.toBeNull()
  })

  it('devrait révoquer toutes les sessions avec revokeAllUserRefreshTokens', async () => {
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

    await revokeAllUserRefreshTokens(testDb, login1.data.user.id)

    const p1 = await verifyRefreshToken(login1.data.refreshToken, REFRESH_SECRET)
    const p2 = await verifyRefreshToken(login2.data.refreshToken, REFRESH_SECRET)
    if (!p1 || !p2) return

    const s1 = await findValidRefreshToken(testDb, p1.jti)
    const s2 = await findValidRefreshToken(testDb, p2.jti)

    expect(s1).toBeNull()
    expect(s2).toBeNull()
  })

  it('ne devrait pas affecter un autre utilisateur lors de la révocation globale', async () => {
    const toto = TEST_CREDENTIALS.toto
    const alice = TEST_CREDENTIALS.alice
    await createTestUser(toto.rawEmail, toto.rawPassword)
    await createTestUser(alice.rawEmail, alice.rawPassword)

    const loginToto = await login(createCtx(), toto.email, toto.password)
    const loginAlice = await login(createCtx(), alice.email, alice.password)

    expect(loginToto.success).toBe(true)
    expect(loginAlice.success).toBe(true)
    if (!loginToto.success || !loginAlice.success) return

    await revokeAllUserRefreshTokens(testDb, loginToto.data.user.id)

    const pAlice = await verifyRefreshToken(loginAlice.data.refreshToken, REFRESH_SECRET)
    if (!pAlice) return
    const sAlice = await findValidRefreshToken(testDb, pAlice.jti)
    expect(sAlice).not.toBeNull()
  })

  it("ne devrait pas affecter un autre utilisateur lors d'un logout simple", async () => {
    const toto = TEST_CREDENTIALS.toto
    const alice = TEST_CREDENTIALS.alice
    await createTestUser(toto.rawEmail, toto.rawPassword)
    await createTestUser(alice.rawEmail, alice.rawPassword)

    const loginToto = await login(
      createCtx({ ip: '192.168.1.1', userAgent: 'AppareilToto' }),
      toto.email,
      toto.password
    )
    const loginAlice = await login(
      createCtx({ ip: '192.168.1.2', userAgent: 'AppareilAlice' }),
      alice.email,
      alice.password
    )

    expect(loginToto.success).toBe(true)
    expect(loginAlice.success).toBe(true)
    if (!loginToto.success || !loginAlice.success) return

    await logout(createCtx(), loginToto.data.refreshToken)

    const pAlice = await verifyRefreshToken(loginAlice.data.refreshToken, REFRESH_SECRET)
    if (!pAlice) return
    const sAlice = await findValidRefreshToken(testDb, pAlice.jti)
    expect(sAlice).not.toBeNull()
  })

  it('devrait pouvoir se reconnecter après une révocation globale', async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const loginResult = await login(createCtx(), creds.email, creds.password)
    if (!loginResult.success) return

    await revokeAllUserRefreshTokens(testDb, loginResult.data.user.id)

    const reloginResult = await login(createCtx(), creds.email, creds.password)
    expect(reloginResult.success).toBe(true)
    if (!reloginResult.success) return

    const p = await verifyRefreshToken(reloginResult.data.refreshToken, REFRESH_SECRET)
    if (!p) return
    const stored = await findValidRefreshToken(testDb, p.jti)
    expect(stored).not.toBeNull()
  })

  it('devrait associer la bonne IP et UserAgent à chaque session', async () => {
    const creds = TEST_CREDENTIALS.toto
    await createTestUser(creds.rawEmail, creds.rawPassword)

    const appareils = [
      { ip: '192.168.1.1', userAgent: 'Mobile/iOS' },
      { ip: '10.0.0.42', userAgent: 'Desktop/Chrome' },
      { ip: '172.16.0.5', userAgent: 'Tablet/Safari' },
    ]

    const resultats = await Promise.all(
      appareils.map(async (appareil) => ({
        appareil,
        login: await login(createCtx(appareil), creds.email, creds.password),
      }))
    )

    for (const { appareil, login: result } of resultats) {
      expect(result.success).toBe(true)
      if (!result.success) continue

      const payload = await verifyRefreshToken(result.data.refreshToken, REFRESH_SECRET)
      if (!payload) continue
      const stored = await findValidRefreshToken(testDb, payload.jti)
      if (!stored) continue

      expect(stored.ip).toBe(appareil.ip)
      expect(stored.userAgent).toBe(appareil.userAgent)
    }
  })
})
