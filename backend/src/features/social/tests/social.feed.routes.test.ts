import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS, type PostTone, type SkinConcern, type SkinType } from '@aurore/shared'

import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { profiles, userDermoProfiles } from '../../../db/schema/auth/users'
import { socialPosts } from '../../../db/schema/social/posts'
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

// Shared dermo so peers land in a known band relative to the viewer.
const SENSITIVE: Dermo = {
  skinConcerns: ['rosacee'],
  skinTypes: ['peau-sensible'],
  fitzpatrickType: 3,
}

describe('GET /api/social/feed', () => {
  let app: Hono<AppEnv>
  let client: TestClient

  beforeEach(async () => {
    const env = await createTestEnv()
    app = env.app
    client = env.client
  })

  async function seedViewer(dermo: Dermo = SENSITIVE): Promise<string> {
    const viewer = await createTestUser('viewer@feed.test', 'Azerty123!')
    const token = await loginAndGetToken(app, 'viewer@feed.test', 'Azerty123!')
    await testDb.insert(userDermoProfiles).values({ userId: viewer.id, ...dermo })
    return token
  }

  // Returns the peer userId so the caller can author posts as them.
  async function seedPeer(
    username: string,
    dermo: Dermo,
    gate: { profilePublic?: boolean; discoverable?: boolean } = {}
  ): Promise<string> {
    const { profilePublic = true, discoverable = true } = gate
    const peer = await createTestUser(`${username}@feed.test`, 'Azerty123!')
    await testDb
      .update(profiles)
      .set({ username, profilePublic })
      .where(eq(profiles.userId, peer.id))
    await testDb.insert(userDermoProfiles).values({ userId: peer.id, discoverable, ...dermo })
    return peer.id
  }

  async function insertPost(
    authorId: string,
    post: { tone: PostTone; concernSlug: SkinConcern; createdAt: string; content?: string }
  ): Promise<void> {
    await testDb.insert(socialPosts).values({
      authorId,
      tone: post.tone,
      content: post.content ?? 'Mon expérience.',
      concernSlug: post.concernSlug,
      createdAt: post.createdAt,
    })
  }

  async function fetchFeed(token: string, query: Record<string, string> = {}) {
    const res = await client.social.feed.$get({ query }, withAuth(token))
    expect(res.status).toBe(HTTP_STATUS.OK)
    const data = await res.json()
    if (!data.success) throw new Error('expected ok')
    return data.data
  }

  it('rejects an unauthenticated request — the feed needs a viewer', async () => {
    const res = await app.request('/api/social/feed')
    expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
  })

  it('returns an empty feed for a viewer with no discoverable cohort', async () => {
    const token = await seedViewer()
    const data = await fetchFeed(token)
    expect(data).toEqual({ posts: [] })
  })

  it('shows only posts from the similar cohort — a non-discoverable author never surfaces', async () => {
    const token = await seedViewer()
    const close = await seedPeer('close', SENSITIVE)
    const hidden = await seedPeer('hidden', SENSITIVE, { discoverable: false })
    await insertPost(close, { tone: 'principal', concernSlug: 'rosacee', createdAt: ts(10) })
    await insertPost(hidden, { tone: 'principal', concernSlug: 'rosacee', createdAt: ts(11) })

    const data = await fetchFeed(token)
    expect(data.posts.map((p) => p.author.username)).toEqual(['close'])
  })

  it('defaults to the principal tone; coup-de-gueule is a tab entered on purpose', async () => {
    const token = await seedViewer()
    const close = await seedPeer('close', SENSITIVE)
    await insertPost(close, { tone: 'principal', concernSlug: 'rosacee', createdAt: ts(10) })
    await insertPost(close, { tone: 'coup-de-gueule', concernSlug: 'rosacee', createdAt: ts(11) })

    const principal = await fetchFeed(token)
    expect(principal.posts.map((p) => p.tone)).toEqual(['principal'])

    const gueule = await fetchFeed(token, { tone: 'coup-de-gueule' })
    expect(gueule.posts.map((p) => p.tone)).toEqual(['coup-de-gueule'])
  })

  it('orders by recency by default (newest first), never by anything implicit', async () => {
    const token = await seedViewer()
    const close = await seedPeer('close', SENSITIVE)
    const far = await seedPeer('far', {
      skinConcerns: ['anti-acne'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 3,
    })
    await insertPost(close, { tone: 'principal', concernSlug: 'rosacee', createdAt: ts(10) })
    await insertPost(far, { tone: 'principal', concernSlug: 'anti-acne', createdAt: ts(12) })

    const data = await fetchFeed(token)
    // far's post is newer → first, regardless of the author's closeness.
    expect(data.posts.map((p) => p.author.username)).toEqual(['far', 'close'])
  })

  it('orders by similarity on demand — closest authors first, never by reactions (#3)', async () => {
    const token = await seedViewer()
    const close = await seedPeer('close', SENSITIVE)
    const far = await seedPeer('far', {
      skinConcerns: ['anti-acne'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 3,
    })
    // far posts newer; similarity order must still float the closer author up.
    await insertPost(close, { tone: 'principal', concernSlug: 'rosacee', createdAt: ts(10) })
    await insertPost(far, { tone: 'principal', concernSlug: 'anti-acne', createdAt: ts(12) })

    const data = await fetchFeed(token, { order: 'similarity' })
    expect(data.posts.map((p) => p.author.username)).toEqual(['close', 'far'])
    expect(data.posts.map((p) => p.authorBand)).toEqual(['tres-proche', 'proche'])
  })

  it('scopes by concern bucket — rosacée surfaces couperose, excludes unrelated concerns', async () => {
    const token = await seedViewer()
    const close = await seedPeer('close', SENSITIVE)
    const far = await seedPeer('far', {
      skinConcerns: ['anti-acne'],
      skinTypes: ['peau-sensible'],
      fitzpatrickType: 3,
    })
    await insertPost(close, { tone: 'principal', concernSlug: 'rosacee', createdAt: ts(10) })
    await insertPost(close, { tone: 'principal', concernSlug: 'couperose', createdAt: ts(11) })
    await insertPost(far, { tone: 'principal', concernSlug: 'anti-acne', createdAt: ts(12) })

    const data = await fetchFeed(token, { concern: 'rosacee' })
    // couperose shares rosacée's clinical bucket; anti-acné does not.
    expect(data.posts.map((p) => p.concernSlug).sort()).toEqual(['couperose', 'rosacee'])
  })

  it('ships an ordinal band per item and never a count (ADR-0013 / #1 zéro-chiffre)', async () => {
    const token = await seedViewer()
    const close = await seedPeer('close', SENSITIVE)
    await insertPost(close, { tone: 'principal', concernSlug: 'rosacee', createdAt: ts(10) })

    const data = await fetchFeed(token)
    expect(data.posts).toHaveLength(1)
    const [item] = data.posts
    expect(Object.keys(item).sort()).toEqual([
      'author',
      'authorBand',
      'concernSlug',
      'content',
      'createdAt',
      'id',
      'ingredientAnchor',
      'productAnchor',
      'tone',
    ])
    expect(['tres-proche', 'proche']).toContain(item.authorBand)
    // No counter rides along anywhere in the payload (structural zéro-compteur).
    expect(JSON.stringify(data)).not.toMatch(/count|total/i)
  })
})

// Deterministic, ordered timestamps (ISO 8601 UTC) so recency assertions are stable.
function ts(hour: number): string {
  return `2026-01-01T${String(hour).padStart(2, '0')}:00:00.000Z`
}
