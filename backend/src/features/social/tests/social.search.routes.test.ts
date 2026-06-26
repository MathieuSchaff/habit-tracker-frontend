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

describe('GET /api/social/profiles/search', () => {
  let app: Hono<AppEnv>
  let client: TestClient

  beforeEach(async () => {
    const env = await createTestEnv()
    app = env.app
    client = env.client
  })

  async function seedViewer(dermo: Dermo = {}): Promise<string> {
    const viewer = await createTestUser('viewer@social.test', 'Azerty123!')
    const token = await loginAndGetToken(app, 'viewer@social.test', 'Azerty123!')
    await testDb.insert(userDermoProfiles).values({ userId: viewer.id, ...dermo })
    return token
  }

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

  async function fetchSearch(token: string, concern: SkinConcern) {
    const res = await client.social.profiles.search.$get({ query: { concern } }, withAuth(token))
    expect(res.status).toBe(HTTP_STATUS.OK)
    const data = await res.json()
    if (!data.success) throw new Error('expected ok')
    return data.data
  }

  it('rejects an unauthenticated request', async () => {
    const res = await app.request('/api/social/profiles/search?concern=rosacee')
    expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
  })

  it('returns an empty list when no discoverable peer matches the concern', async () => {
    const token = await seedViewer({ skinConcerns: ['rosacee'] })
    const data = await fetchSearch(token, 'rosacee')
    expect(data).toEqual({ profiles: [] })
  })

  it('matches by clinical bucket, not raw concern (rosacée finds couperose)', async () => {
    const token = await seedViewer({
      skinConcerns: ['rosacee'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 3,
    })
    // Same rougeurs-vasculaires bucket, different raw term → must match.
    await seedPeer('couperose-peer', {
      skinConcerns: ['couperose'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 3,
    })
    // Different bucket → must not match the rosacée search.
    await seedPeer('acne-peer', {
      skinConcerns: ['anti-acne'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 3,
    })

    const data = await fetchSearch(token, 'rosacee')
    expect(data.profiles).toEqual([{ username: 'couperose-peer', band: 'tres-proche' }])
  })

  it('fans a multi-bucket concern across all its families (post-acne → acné + réparation)', async () => {
    const token = await seedViewer({
      skinConcerns: ['post-acne'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 3,
    })
    // anti-acne shares the acné-imperfections bucket; cicatrisation shares réparation.
    await seedPeer('acne-peer', {
      skinConcerns: ['anti-acne'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 3,
    })
    await seedPeer('scar-peer', {
      skinConcerns: ['cicatrisation'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 3,
    })

    const data = await fetchSearch(token, 'post-acne')
    expect(data.profiles.map((p) => p.username)).toEqual(['acne-peer', 'scar-peer'])
  })

  it('returns only opt-in peers under the master gate', async () => {
    const token = await seedViewer({
      skinConcerns: ['rosacee'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 3,
    })
    const shared: Dermo = {
      skinConcerns: ['rosacee'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 3,
    }
    await seedPeer('visible', shared)
    await seedPeer('not-discoverable', shared, { discoverable: false })
    await seedPeer('private', shared, { profilePublic: false })
    await seedPeer('forced-private', shared, { forcedPrivateByAdmin: true })

    const data = await fetchSearch(token, 'rosacee')
    expect(data.profiles).toEqual([{ username: 'visible', band: 'tres-proche' }])
  })

  it('rejects a free-text concern (input is a picked term, never trgm text)', async () => {
    const token = await seedViewer({ skinConcerns: ['rosacee'] })
    const res = await app.request('/api/social/profiles/search?concern=not-a-real-concern', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  it('gates search on similarity: a concern match dissimilar to the viewer (éloigné) is not surfaced', async () => {
    // Viewer does not share the searched concern's family, and differs on every
    // axis → the only concern match scores éloigné → excluded (similarity is the
    // universal lens, even for active search).
    const token = await seedViewer({
      skinConcerns: ['anti-acne'],
      skinTypes: ['peau-grasse'],
      fitzpatrickType: 1,
    })
    await seedPeer('distant-rosacea', {
      skinConcerns: ['rosacee'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 6,
    })

    const data = await fetchSearch(token, 'rosacee')
    expect(data.profiles).toEqual([])
  })
})
