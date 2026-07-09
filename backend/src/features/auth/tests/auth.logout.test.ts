import { describe, expect, it } from 'bun:test'

import { setupDbTests } from '../../../tests/db-setup'
import { REFRESH_SECRET } from '../../../tests/helpers/secrets'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { verifyRefreshToken } from '../jwt.utils'
import { findValidRefreshToken } from '../refresh-token.service'
import { login, logout } from '../service'
import { createCtx, testDb } from './auth-test.setup'

setupDbTests()

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
