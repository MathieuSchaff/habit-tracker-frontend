import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS, type PublicProfileView } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import { authPatch, setupAndLogin } from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

async function seedOwner(app: Hono<AppEnv>, username: string) {
  const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
  await authPatch(app, '/profile', token, {
    username,
    bio: 'My bio',
    avatarUrl: 'https://example.com/me.png',
    links: [{ label: 'IG', url: 'https://instagram.com/me' }],
  })
  await authPatch(app, '/profile/dermo', token, {
    skinTypes: ['peau-mixte'],
    fitzpatrickType: 3,
    skinConcerns: ['rosacee'],
  })
  return token
}

describe('GET /profiles/:username/public', () => {
  let app: Hono<AppEnv>

  beforeEach(async () => {
    app = await createTestApp()
  })

  it('returns 404 for an unknown username', async () => {
    const res = await app.request('/profiles/no-such-user/public')
    expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
  })

  it('returns 404 when the master profilePublic flag is off', async () => {
    await seedOwner(app, 'matt-private')

    const res = await app.request('/profiles/matt-private/public')
    expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
  })

  it('returns username only when master is on and sub-flags are off', async () => {
    const token = await seedOwner(app, 'matt-shy')
    await authPatch(app, '/profile/privacy-settings', token, { profilePublic: true })

    const res = await app.request('/profiles/matt-shy/public')
    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = (await res.json()) as { success: true; data: PublicProfileView }
    expect(body.data).toEqual({
      username: 'matt-shy',
      bio: null,
      avatarUrl: null,
      links: null,
      skinTypes: null,
      fitzpatrickType: null,
      skinConcerns: null,
    })
  })

  it('returns every field when all flags are on', async () => {
    const token = await seedOwner(app, 'matt-open')
    await authPatch(app, '/profile/privacy-settings', token, {
      profilePublic: true,
      bioPublic: true,
      avatarPublic: true,
      linksPublic: true,
      skinTypesPublic: true,
      fitzpatrickPublic: true,
      skinConcernsPublic: true,
    })

    const res = await app.request('/profiles/matt-open/public')
    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = (await res.json()) as { success: true; data: PublicProfileView }
    expect(body.data).toEqual({
      username: 'matt-open',
      bio: 'My bio',
      avatarUrl: 'https://example.com/me.png',
      links: [{ label: 'IG', url: 'https://instagram.com/me' }],
      skinTypes: ['peau-mixte'],
      fitzpatrickType: 3,
      skinConcerns: ['rosacee'],
    })
  })

  it('rejects empty username param (zValidator)', async () => {
    const res = await app.request('/profiles/%20/public')
    // trim+min(1) → 400 (zValidator default)
    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
  })
})
