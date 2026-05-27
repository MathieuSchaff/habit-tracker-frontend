import { beforeEach, describe, expect, it } from 'bun:test'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { testDb } from '../../../tests/db.test.config'
import { setupDbTests } from '../../../tests/db-setup'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import { authPatch, setupAndLogin } from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'
import { getPublicProfileByUsername } from '../service'

// Service-level matrix for getPublicProfileByUsername. Exercises RLS
// gate (master `profile_public`) and the per-field projection so we
// have proof the toggles actually mask data — there is no public HTTP
// route yet, this is the only consumer.

async function setupOwner(app: Hono<AppEnv>, username: string) {
  const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
  await authPatch(app, '/api/profile', token, {
    username,
    bio: 'My bio',
    avatarUrl: 'https://example.com/me.png',
    links: [{ label: 'IG', url: 'https://instagram.com/me' }],
  })
  await authPatch(app, '/api/profile/dermo', token, {
    skinTypes: ['peau-mixte'],
    fitzpatrickType: 3,
    skinConcerns: ['rosacee'],
  })
  return token
}

setupDbTests()

describe('getPublicProfileByUsername', () => {
  let app: Hono<AppEnv>

  beforeEach(async () => {
    app = await createTestApp()
  })

  it('returns null when master profilePublic is false', async () => {
    await setupOwner(app, 'matt-private')

    const view = await getPublicProfileByUsername(testDb, 'matt-private')
    expect(view).toBeNull()
  })

  it('returns null for an unknown username', async () => {
    const view = await getPublicProfileByUsername(testDb, 'no-such-user')
    expect(view).toBeNull()
  })

  it('exposes only username when master is on and all sub-flags are off', async () => {
    const token = await setupOwner(app, 'matt-shy')
    await authPatch(app, '/api/profile/privacy-settings', token, { profilePublic: true })

    const view = await getPublicProfileByUsername(testDb, 'matt-shy')
    expect(view).toEqual({
      username: 'matt-shy',
      bio: null,
      avatarUrl: null,
      links: null,
      skinTypes: null,
      fitzpatrickType: null,
      skinConcerns: null,
    })
  })

  it('exposes each profile field when its sub-flag is on', async () => {
    const token = await setupOwner(app, 'matt-bio')
    await authPatch(app, '/api/profile/privacy-settings', token, {
      profilePublic: true,
      bioPublic: true,
      avatarPublic: true,
      linksPublic: true,
    })

    const view = await getPublicProfileByUsername(testDb, 'matt-bio')
    expect(view?.bio).toBe('My bio')
    expect(view?.avatarUrl).toBe('https://example.com/me.png')
    expect(view?.links).toEqual([{ label: 'IG', url: 'https://instagram.com/me' }])
    expect(view?.skinTypes).toBeNull()
    expect(view?.fitzpatrickType).toBeNull()
    expect(view?.skinConcerns).toBeNull()
  })

  it('exposes each dermo field when its sub-flag is on', async () => {
    const token = await setupOwner(app, 'matt-skin')
    await authPatch(app, '/api/profile/privacy-settings', token, {
      profilePublic: true,
      skinTypesPublic: true,
      fitzpatrickPublic: true,
      skinConcernsPublic: true,
    })

    const view = await getPublicProfileByUsername(testDb, 'matt-skin')
    expect(view?.skinTypes).toEqual(['peau-mixte'])
    expect(view?.fitzpatrickType).toBe(3)
    expect(view?.skinConcerns).toEqual(['rosacee'])
    expect(view?.bio).toBeNull()
    expect(view?.avatarUrl).toBeNull()
    expect(view?.links).toBeNull()
  })

  it('exposes every field when all flags are on', async () => {
    const token = await setupOwner(app, 'matt-open')
    await authPatch(app, '/api/profile/privacy-settings', token, {
      profilePublic: true,
      bioPublic: true,
      avatarPublic: true,
      linksPublic: true,
      skinTypesPublic: true,
      fitzpatrickPublic: true,
      skinConcernsPublic: true,
    })

    const view = await getPublicProfileByUsername(testDb, 'matt-open')
    expect(view).toEqual({
      username: 'matt-open',
      bio: 'My bio',
      avatarUrl: 'https://example.com/me.png',
      links: [{ label: 'IG', url: 'https://instagram.com/me' }],
      skinTypes: ['peau-mixte'],
      fitzpatrickType: 3,
      skinConcerns: ['rosacee'],
    })
  })
})
