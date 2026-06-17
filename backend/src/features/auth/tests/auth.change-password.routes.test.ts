import { beforeAll, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import { setupDbTests } from '../../../tests/db-setup'
import { createTestClient, type TestClient } from '../../../tests/helpers/createTestClient'
import { unsafeEmail } from '../../../tests/helpers/unsafe'

setupDbTests()

describe('Auth Routes > POST /auth/change-password', () => {
  let client: TestClient

  const email = unsafeEmail('change-pwd@example.com')
  const oldPassword = 'OldPassword123!'
  const newPassword = 'NewPassword456!'

  beforeAll(async () => {
    client = await createTestClient()
  })

  // Signup no longer establishes a session (ADR 0009): sign up, then log in to get
  // a token + refresh cookie for the authenticated change-password calls.
  async function signupThenLogin(emailArg: string, password: string) {
    const signupRes = await client.auth.signup.$post({ json: { email: emailArg, password } })
    const signupData = await signupRes.json()
    if (!signupData.success) throw new Error('signup failed')

    const loginRes = await client.auth.login.$post({ json: { email: emailArg, password } })
    const loginData = await loginRes.json()
    if (!loginData.success) throw new Error('login failed')
    return { loginRes, token: loginData.data.accessToken }
  }

  it('should change password successfully with valid current password', async () => {
    const { token: userToken } = await signupThenLogin(email, oldPassword)

    const res = await client.auth['change-password'].$post(
      {
        json: { currentPassword: oldPassword, newPassword },
      },
      { headers: { Authorization: `Bearer ${userToken}` } }
    )

    expect(res.status).toBe(HTTP_STATUS.OK)
    const data = await res.json()
    expect(data.success).toBe(true)

    const loginRes = await client.auth.login.$post({
      json: { email, password: newPassword },
    })
    expect(loginRes.status).toBe(HTTP_STATUS.OK)
  })

  it('should reject with invalid current password', async () => {
    const { token: userToken } = await signupThenLogin('another-user@example.com', oldPassword)

    const res = await client.auth['change-password'].$post(
      {
        json: {
          currentPassword: 'WrongPassword123!',
          newPassword: 'EvenNewerPassword123!',
        },
      },
      { headers: { Authorization: `Bearer ${userToken}` } }
    )

    expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    const data = await res.json()
    expect(data.success).toBe(false)
    if (!data.success) expect(data.error).toBe('invalid_credentials')
  })

  it('should reject weak new password', async () => {
    const { token: userToken } = await signupThenLogin('weak-pwd@example.com', oldPassword)

    const res = await client.auth['change-password'].$post(
      {
        json: { currentPassword: oldPassword, newPassword: 'weak' },
      },
      { headers: { Authorization: `Bearer ${userToken}` } }
    )

    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  it('should revoke existing refresh tokens after a successful change', async () => {
    const sessionEmail = unsafeEmail('change-pwd-revoke@example.com')
    const { loginRes, token: userToken } = await signupThenLogin(sessionEmail, oldPassword)
    const oldRefreshCookie =
      loginRes.headers.getSetCookie().find((c) => c.startsWith('refresh_token=')) ?? ''
    expect(oldRefreshCookie).toContain('refresh_token=')

    const changeRes = await client.auth['change-password'].$post(
      { json: { currentPassword: oldPassword, newPassword } },
      { headers: { Authorization: `Bearer ${userToken}` } }
    )
    expect(changeRes.status).toBe(HTTP_STATUS.OK)

    const refreshRes = await client.auth.refresh.$post(
      {},
      { headers: { Cookie: oldRefreshCookie } }
    )
    expect(refreshRes.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    const refreshData = await refreshRes.json()
    expect(refreshData.success).toBe(false)
    if (!refreshData.success) expect(refreshData.error).toBe('invalid_token')
  })

  it('should reject unauthenticated request', async () => {
    const res = await client.auth['change-password'].$post({
      json: {
        currentPassword: oldPassword,
        newPassword: 'AnotherPassword123!',
      },
    })

    expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
  })
})
