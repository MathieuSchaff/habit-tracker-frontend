import { beforeAll, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

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

  it('should change password successfully with valid current password', async () => {
    const signupRes = await client.auth.signup.$post({
      json: { email, password: oldPassword },
    })
    const signupData = await signupRes.json()
    if (!signupData.success) throw new Error('signup failed')
    const userToken = signupData.data.accessToken
    const _userId = signupData.data.user.id

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
    const signupRes = await client.auth.signup.$post({
      json: { email: 'another-user@example.com', password: oldPassword },
    })
    const signupData = await signupRes.json()
    if (!signupData.success) throw new Error('signup failed')
    const userToken = signupData.data.accessToken

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
    const signupRes = await client.auth.signup.$post({
      json: { email: 'weak-pwd@example.com', password: oldPassword },
    })
    const signupData = await signupRes.json()
    if (!signupData.success) throw new Error('signup failed')
    const userToken = signupData.data.accessToken

    const res = await client.auth['change-password'].$post(
      {
        json: { currentPassword: oldPassword, newPassword: 'weak' },
      },
      { headers: { Authorization: `Bearer ${userToken}` } }
    )

    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
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
