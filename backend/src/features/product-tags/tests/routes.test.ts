import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import { createTestEnv, type TestClient, withAuth } from '../../../tests/helpers/createTestClient'
import { expectStatus } from '../../../tests/helpers/expectStatus'
import { setupAndLogin } from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

type ApiErrorBody = { success: false; error: string }
type TestApp = Awaited<ReturnType<typeof createTestEnv>>['app']

const VALID_TAG = { name: 'Anti-âge' }

describe('Product Tag Routes', () => {
  let app: TestApp
  let client: TestClient

  beforeEach(async () => {
    ;({ app, client } = await createTestEnv())
  })

  describe('POST /product-tags', () => {
    it('should create a tag with only a name', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await client['product-tags'].$post({ json: VALID_TAG }, withAuth(token))

      expectStatus(res, HTTP_STATUS.CREATED)
      const data = await res.json()
      if (!data.success) throw new Error('create tag failed')
      expect(data.data.id).toBeDefined()
      expect(data.data.label).toBe('Anti-âge')
      expect(data.data.slug).toBe('anti-age')
      expect(data.data.tagType).toBe('')
    })

    it('should create a tag with a category', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await client['product-tags'].$post(
        { json: { name: 'Peau grasse', category: 'skin_type' } },
        withAuth(token),
      )

      expectStatus(res, HTTP_STATUS.CREATED)
      const data = await res.json()
      if (!data.success) throw new Error('create tag failed')
      expect(data.data.label).toBe('Peau grasse')
      expect(data.data.tagType).toBe('skin_type')
    })

    it('should auto-generate slug from name', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await client['product-tags'].$post(
        { json: { name: 'Rides et Ridules' } },
        withAuth(token),
      )
      const data = await res.json()
      if (!data.success) throw new Error('create tag failed')

      expect(data.data.slug).toBe('rides-et-ridules')
    })

    it('should use custom slug when provided', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await client['product-tags'].$post(
        { json: { name: 'Éclat', slug: 'eclat-custom' } },
        withAuth(token),
      )
      const data = await res.json()
      if (!data.success) throw new Error('create tag failed')

      expect(data.data.slug).toBe('eclat-custom')
    })

    it('should store a createdAt timestamp', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await client['product-tags'].$post({ json: VALID_TAG }, withAuth(token))
      const data = await res.json()
      if (!data.success) throw new Error('create tag failed')

      expect(data.data.createdAt).toBeDefined()
    })

    it('should return 409 for duplicate slug', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      await client['product-tags'].$post(
        { json: { name: 'Acné', slug: 'acne' } },
        withAuth(token),
      )
      const res = await client['product-tags'].$post(
        { json: { name: 'Acné Bis', slug: 'acne' } },
        withAuth(token),
      )

      expectStatus(res, HTTP_STATUS.CONFLICT)
      const body = (await res.json()) as unknown as ApiErrorBody
      expect(body.success).toBe(false)
      expect(body.error).toBe('tag_already_exists')
    })

    it('should reject missing name', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await client['product-tags'].$post(
        // @ts-expect-error — missing required name; testing schema rejection
        { json: { category: 'skin_type' } },
        withAuth(token),
      )

      expectStatus(res, HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request('/product-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_TAG),
      })

      expectStatus(res, HTTP_STATUS.UNAUTHORIZED)
    })

    it('should reject request with invalid token', async () => {
      const res = await client['product-tags'].$post(
        { json: VALID_TAG },
        withAuth('invalid.token.here'),
      )

      expectStatus(res, HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('GET /product-tags/:id', () => {
    it('should return the tag without auth', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await client['product-tags'].$post({ json: VALID_TAG }, withAuth(token))
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create tag failed')
      const created = createData.data

      const res = await client['product-tags'][':id'].$get({ param: { id: created.id } })

      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('get tag failed')
      expect(data.data.id).toBe(created.id)
      expect(data.data.label).toBe('Anti-âge')
    })

    it('should also work when authenticated', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await client['product-tags'].$post({ json: VALID_TAG }, withAuth(token))
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create tag failed')
      const created = createData.data

      const res = await client['product-tags'][':id'].$get(
        { param: { id: created.id } },
        withAuth(token),
      )

      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('get tag failed')
      expect(data.data.id).toBe(created.id)
    })

    it('should return 404 for unknown id', async () => {
      const res = await client['product-tags'][':id'].$get({
        param: { id: crypto.randomUUID() },
      })

      expectStatus(res, HTTP_STATUS.NOT_FOUND)
      const body = (await res.json()) as unknown as ApiErrorBody
      expect(body.success).toBe(false)
      expect(body.error).toBe('tag_not_found')
    })

    it('should return 400 for an invalid UUID', async () => {
      const res = await client['product-tags'][':id'].$get({ param: { id: 'not-a-uuid' } })

      expectStatus(res, HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('PATCH /product-tags/:id', () => {
    it('should update tag fields', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await client['product-tags'].$post(
        { json: { name: 'Rides' } },
        withAuth(token),
      )
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create tag failed')
      const created = createData.data

      const res = await client['product-tags'][':id'].$patch(
        { param: { id: created.id }, json: { name: 'Rides et Ridules', category: 'concern' } },
        withAuth(token),
      )

      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('update tag failed')
      expect(data.data.label).toBe('Rides et Ridules')
      expect(data.data.tagType).toBe('concern')
    })

    it('should persist updates across requests', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await client['product-tags'].$post({ json: VALID_TAG }, withAuth(token))
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create tag failed')
      const created = createData.data

      await client['product-tags'][':id'].$patch(
        { param: { id: created.id }, json: { name: 'Anti-âge Pro' } },
        withAuth(token),
      )

      const res = await client['product-tags'][':id'].$get({ param: { id: created.id } })
      const data = await res.json()
      if (!data.success) throw new Error('get tag failed')
      expect(data.data.label).toBe('Anti-âge Pro')
    })

    it('should return 404 for unknown id', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await client['product-tags'][':id'].$patch(
        { param: { id: crypto.randomUUID() }, json: { name: 'X' } },
        withAuth(token),
      )

      expectStatus(res, HTTP_STATUS.NOT_FOUND)
      const body = (await res.json()) as unknown as ApiErrorBody
      expect(body.error).toBe('tag_not_found')
    })

    it('should return 409 when updating to a conflicting slug', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      await client['product-tags'].$post(
        { json: { name: 'Éclat', slug: 'eclat' } },
        withAuth(token),
      )
      const r2 = await client['product-tags'].$post(
        { json: { name: 'Luminosité' } },
        withAuth(token),
      )
      const r2Data = await r2.json()
      if (!r2Data.success) throw new Error('create tag failed')
      const t2 = r2Data.data

      const res = await client['product-tags'][':id'].$patch(
        { param: { id: t2.id }, json: { name: 'Éclat', slug: 'eclat' } },
        withAuth(token),
      )

      expectStatus(res, HTTP_STATUS.CONFLICT)
      const body = (await res.json()) as unknown as ApiErrorBody
      expect(body.error).toBe('tag_already_exists')
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request(`/product-tags/${crypto.randomUUID()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'X' }),
      })

      expectStatus(res, HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('DELETE /product-tags/:id', () => {
    it('should delete the tag and return null data', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await client['product-tags'].$post({ json: VALID_TAG }, withAuth(token))
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create tag failed')
      const created = createData.data

      const res = await client['product-tags'][':id'].$delete(
        { param: { id: created.id } },
        withAuth(token),
      )

      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('delete failed')
      expect(data.data).toBeNull()
    })

    it('should make the tag unreachable after deletion', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await client['product-tags'].$post({ json: VALID_TAG }, withAuth(token))
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create tag failed')
      const created = createData.data

      await client['product-tags'][':id'].$delete(
        { param: { id: created.id } },
        withAuth(token),
      )

      const res = await client['product-tags'][':id'].$get({ param: { id: created.id } })
      expectStatus(res, HTTP_STATUS.NOT_FOUND)
    })

    it('should not affect other tags when deleting one', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const r1 = await client['product-tags'].$post({ json: VALID_TAG }, withAuth(token))
      const r2 = await client['product-tags'].$post(
        { json: { name: 'Hydratation' } },
        withAuth(token),
      )

      const r1Data = await r1.json()
      const r2Data = await r2.json()
      if (!r1Data.success || !r2Data.success) throw new Error('create tag failed')
      const t1 = r1Data.data
      const t2 = r2Data.data

      await client['product-tags'][':id'].$delete(
        { param: { id: t1.id } },
        withAuth(token),
      )

      const res = await client['product-tags'][':id'].$get({ param: { id: t2.id } })
      expectStatus(res, HTTP_STATUS.OK)
    })

    it('should return 404 for unknown id', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await client['product-tags'][':id'].$delete(
        { param: { id: crypto.randomUUID() } },
        withAuth(token),
      )

      expectStatus(res, HTTP_STATUS.NOT_FOUND)
      const body = (await res.json()) as unknown as ApiErrorBody
      expect(body.error).toBe('tag_not_found')
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request(`/product-tags/${crypto.randomUUID()}`, { method: 'DELETE' })

      expectStatus(res, HTTP_STATUS.UNAUTHORIZED)
    })
  })
})
