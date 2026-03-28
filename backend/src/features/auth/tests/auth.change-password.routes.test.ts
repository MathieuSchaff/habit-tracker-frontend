import { beforeAll, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import { unsafeEmail } from '../../../tests/helpers/unsafe'

describe('Auth Routes > POST /auth/change-password', () => {
  let app: Hono<AppEnv>

  const email = unsafeEmail('change-pwd@example.com')
  const oldPassword = 'OldPassword123!'
  const newPassword = 'NewPassword456!'

  beforeAll(async () => {
    app = await createTestApp()
  })

  it('should change password successfully with valid current password', async () => {
    const signupRes = await app.request('/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: oldPassword }),
    })
    const signupData = await signupRes.json()
    const userToken = signupData.data.accessToken
    const _userId = signupData.data.user.id

    const res = await app.request('/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        currentPassword: oldPassword,
        newPassword: newPassword,
      }),
    })

    expect(res.status).toBe(HTTP_STATUS.OK)
    const data = await res.json()
    expect(data.success).toBe(true)

    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: newPassword }),
    })
    expect(loginRes.status).toBe(HTTP_STATUS.OK)
  })

  it('should reject with invalid current password', async () => {
    const signupRes = await app.request('/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'another-user@example.com', password: oldPassword }),
    })
    const signupData = await signupRes.json()
    const userToken = signupData.data.accessToken

    const res = await app.request('/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        currentPassword: 'WrongPassword123!',
        newPassword: 'EvenNewerPassword123!',
      }),
    })

    expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('invalid_credentials')
  })

  it('should reject weak new password', async () => {
    const signupRes = await app.request('/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'weak-pwd@example.com', password: oldPassword }),
    })
    const signupData = await signupRes.json()
    const userToken = signupData.data.accessToken

    const res = await app.request('/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        currentPassword: oldPassword,
        newPassword: 'weak',
      }),
    })

    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  it('should reject unauthenticated request', async () => {
    const res = await app.request('/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: oldPassword,
        newPassword: 'AnotherPassword123!',
      }),
    })

    expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
  })
})
