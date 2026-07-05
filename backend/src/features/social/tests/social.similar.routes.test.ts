import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS, type SkinConcern, type SkinType } from '@aurore/shared'

import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { profiles, userDermoProfiles } from '../../../db/schema/auth/users'
import { testDb } from '../../../tests/db.test.config'
import { setupDbTests } from '../../../tests/db-setup'
import { createTestEnv, type TestClient, withAuth } from '../../../tests/helpers/createTestClient'
import { loginAndGetToken } from '../../../tests/helpers/route-test-helpers'
import { createTestUser } from '../../../tests/helpers/test-factories'

setupDbTests()

type Dermo = {
  skinConcerns?: SkinConcern[]
  skinTypes?: SkinType[] | null
  fitzpatrickType?: number | null
}

describe('GET /api/social/similar', () => {
  let app: Hono<AppEnv>
  let client: TestClient

  beforeEach(async () => {
    const env = await createTestEnv()
    app = env.app
    client = env.client
  })

  // Viewer = a logged-in user with a dermo profile to rank others against.
  async function seedViewer(dermo: Dermo = {}): Promise<string> {
    const viewer = await createTestUser('viewer@social.test', 'Azerty123!')
    const token = await loginAndGetToken(app, 'viewer@social.test', 'Azerty123!')
    await testDb.insert(userDermoProfiles).values({ userId: viewer.id, ...dermo })
    return token
  }

  // Peer = another user. Gate flags default to the surfaceable case
  // (public + discoverable + not force-privated); override to test exclusion.
  async function seedPeer(
    username: string,
    dermo: Dermo,
    gate: { profilePublic?: boolean; discoverable?: boolean; forcedPrivateByAdmin?: boolean } = {}
  ): Promise<void> {
    const { profilePublic = true, discoverable = true, forcedPrivateByAdmin = false } = gate
    const peer = await createTestUser(`${username}@social.test`, 'Azerty123!')
    await testDb
      .update(profiles)
      .set({ username, profilePublic, forcedPrivateByAdmin })
      .where(eq(profiles.userId, peer.id))
    await testDb.insert(userDermoProfiles).values({ userId: peer.id, discoverable, ...dermo })
  }

  async function fetchSimilar(token: string) {
    const res = await client.social.similar.$get({}, withAuth(token))
    expect(res.status).toBe(HTTP_STATUS.OK)
    const data = await res.json()
    if (!data.success) throw new Error('expected ok')
    return data.data
  }

  it('rejects an unauthenticated request — "people like me" needs a viewer', async () => {
    const res = await app.request('/api/social/similar')
    expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
  })

  it('returns an empty cohort for a viewer with no discoverable peers', async () => {
    const token = await seedViewer({ skinConcerns: ['rosacee'] })
    const data = await fetchSimilar(token)
    expect(data).toEqual({ profiles: [] })
  })

  it('surfaces a discoverable public peer with a shared concern as an ordinal band — never a number', async () => {
    const token = await seedViewer({
      skinConcerns: ['rosacee'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 3,
    })
    // couperose shares the rosacee clinical bucket → top band
    await seedPeer('peer-pub', {
      skinConcerns: ['couperose'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 3,
    })

    const data = await fetchSimilar(token)
    expect(data.profiles).toEqual([{ username: 'peer-pub', band: 'tres-proche' }])
    // Doctrine zéro-chiffre: the row carries exactly { username, band } — no
    // score or any other field can ride along (shape assert beats a digit regex).
    expect(Object.keys(data.profiles[0]).sort()).toEqual(['band', 'username'])
    expect(['tres-proche', 'proche']).toContain(data.profiles[0].band)
  })

  it('orders by similarity descending, never by anything else', async () => {
    const token = await seedViewer({
      skinConcerns: ['rosacee'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 3,
    })
    // Seeded far-first to prove the ranking, not insertion order, decides.
    // proche: disjoint concern, but same type + same phototype (0.25 + 0.15).
    await seedPeer('far', {
      skinConcerns: ['anti-acne'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 3,
    })
    // tres-proche: shared concern bucket.
    await seedPeer('close', {
      skinConcerns: ['rosacee'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 3,
    })

    const data = await fetchSimilar(token)
    expect(data.profiles).toEqual([
      { username: 'close', band: 'tres-proche' },
      { username: 'far', band: 'proche' },
    ])
  })

  it('excludes the éloigné band from the surface', async () => {
    const token = await seedViewer({
      skinConcerns: ['rosacee'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 3,
    })
    await seedPeer('close', {
      skinConcerns: ['rosacee'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 3,
    })
    // Fully disjoint on every axis → éloigné, must not appear.
    await seedPeer('distant', {
      skinConcerns: ['anti-acne'],
      skinTypes: ['peau-grasse'],
      fitzpatrickType: 6,
    })

    const data = await fetchSimilar(token)
    expect(data.profiles).toEqual([{ username: 'close', band: 'tres-proche' }])
  })

  it('surfaces only opt-in peers under the master gate', async () => {
    const token = await seedViewer({
      skinConcerns: ['rosacee'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 3,
    })
    // Each excluded peer shares the concern → would be tres-proche if it leaked.
    const shared: Dermo = {
      skinConcerns: ['rosacee'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 3,
    }
    await seedPeer('visible', shared)
    await seedPeer('not-discoverable', shared, { discoverable: false })
    await seedPeer('private', shared, { profilePublic: false })
    await seedPeer('forced-private', shared, { forcedPrivateByAdmin: true })

    const data = await fetchSimilar(token)
    expect(data.profiles).toEqual([{ username: 'visible', band: 'tres-proche' }])
  })

  it('handles a peer with no skin data without crashing (null types / empty concerns → score 0)', async () => {
    const token = await seedViewer({
      skinConcerns: ['rosacee'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 3,
    })
    await seedPeer('normal', {
      skinConcerns: ['rosacee'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 3,
    })
    // Empty dermo: nullable axes left null, concerns default to {}. Scores 0 →
    // éloigné → excluded, but must not throw.
    await seedPeer('empty', { skinTypes: null, fitzpatrickType: null })

    const data = await fetchSimilar(token)
    expect(data.profiles).toEqual([{ username: 'normal', band: 'tres-proche' }])
  })

  it('never lists the viewer in their own cohort, even when discoverable', async () => {
    const viewer = await createTestUser('viewer@social.test', 'Azerty123!')
    const token = await loginAndGetToken(app, 'viewer@social.test', 'Azerty123!')
    // Viewer is themselves public + discoverable — they still must not self-list.
    await testDb
      .update(profiles)
      .set({ username: 'viewer-pub', profilePublic: true })
      .where(eq(profiles.userId, viewer.id))
    await testDb.insert(userDermoProfiles).values({
      userId: viewer.id,
      skinConcerns: ['rosacee'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 3,
      discoverable: true,
    })
    await seedPeer('someone-else', {
      skinConcerns: ['rosacee'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 3,
    })

    const data = await fetchSimilar(token)
    expect(data.profiles).toEqual([{ username: 'someone-else', band: 'tres-proche' }])
  })

  it('breaks equal-score ties deterministically by username', async () => {
    const shared: Dermo = {
      skinConcerns: ['rosacee'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 3,
    }
    const token = await seedViewer(shared)
    // Seeded out of alphabetical order; both score 1.0 → tie broken by username.
    await seedPeer('zoe', shared)
    await seedPeer('amir', shared)

    const data = await fetchSimilar(token)
    expect(data.profiles.map((p) => p.username)).toEqual(['amir', 'zoe'])
  })
})
