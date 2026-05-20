import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { createTestEnv, type TestClient, withAuth } from '../../../tests/helpers/createTestClient'
import { authPatch, setupAndLogin } from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

describe('Profile Links Routes', () => {
  let app: Hono<AppEnv>
  let client: TestClient

  beforeEach(async () => {
    const env = await createTestEnv()
    app = env.app
    client = env.client
  })

  it('should return empty links array for a new profile', async () => {
    const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
    const res = await client.profile.$get({}, withAuth(token))
    const data = await res.json()
    if (!data.success) throw new Error('expected ok')
    expect(data.data.links).toEqual([])
  })

  it('should save and return links', async () => {
    const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
    const links = [{ label: 'Instagram', url: 'https://instagram.com/test' }]
    const res = await client.profile.$patch({ json: { links } }, withAuth(token))
    expect(res.status).toBe(HTTP_STATUS.OK)
    const data = await res.json()
    if (!data.success) throw new Error('expected ok')
    expect(data.data.links).toEqual(links)
  })

  it('should persist links across requests', async () => {
    const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
    const links = [{ label: 'Blog', url: 'https://example.com' }]
    await client.profile.$patch({ json: { links } }, withAuth(token))
    const res = await client.profile.$get({}, withAuth(token))
    const data = await res.json()
    if (!data.success) throw new Error('expected ok')
    expect(data.data.links).toEqual(links)
  })

  it('should replace existing links on update', async () => {
    const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
    await client.profile.$patch(
      { json: { links: [{ label: 'Old', url: 'https://old.com' }] } },
      withAuth(token)
    )
    const res = await client.profile.$patch(
      { json: { links: [{ label: 'New', url: 'https://new.com' }] } },
      withAuth(token)
    )
    const data = await res.json()
    if (!data.success) throw new Error('expected ok')
    expect(data.data.links).toHaveLength(1)
    expect(data.data.links?.[0]?.label).toBe('New')
  })

  it('should accept exactly 5 links', async () => {
    const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
    const links = Array.from({ length: 5 }, (_, i) => ({
      label: `Link ${i}`,
      url: `https://example.com/${i}`,
    }))
    const res = await client.profile.$patch({ json: { links } }, withAuth(token))
    expect(res.status).toBe(HTTP_STATUS.OK)
  })

  // Validator errors return 400; not in the typed response. Use raw helper.
  it('should reject 6 or more links', async () => {
    const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
    const links = Array.from({ length: 6 }, (_, i) => ({
      label: `Link ${i}`,
      url: `https://example.com/${i}`,
    }))
    const res = await authPatch(app, '/profile', token, { links })
    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  it('should reject a link with an invalid URL', async () => {
    const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
    const res = await authPatch(app, '/profile', token, {
      links: [{ label: 'Bad', url: 'not-a-url' }],
    })
    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  it('should reject a link with an empty label', async () => {
    const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
    const res = await authPatch(app, '/profile', token, {
      links: [{ label: '', url: 'https://example.com' }],
    })
    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
  })
})
