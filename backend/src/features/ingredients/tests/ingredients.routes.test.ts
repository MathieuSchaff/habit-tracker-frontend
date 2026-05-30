import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import { setupDbTests } from '../../../tests/db-setup'
import { createTestEnv, type TestClient, withAuth } from '../../../tests/helpers/createTestClient'
import { expectStatus } from '../../../tests/helpers/expectStatus'
import {
  setupAndLogin,
  setupAndLoginAdmin,
  setupAndLoginContributor,
} from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

type ApiErrorBody = { success: false; error: string }
type TestApp = Awaited<ReturnType<typeof createTestEnv>>['app']

const VALID_INGREDIENT = { name: 'Rétinol', type: 'skincare' } as const

async function createIngredient(
  client: TestClient,
  token: string,
  body: {
    name: string
    type?: 'skincare'
    description?: string
    content?: string
    category?: string
    slug?: string
  }
) {
  const res = await client.ingredients.$post(
    { json: { type: 'skincare' as const, ...body } },
    withAuth(token)
  )
  return res
}

setupDbTests()

describe('Ingredient Routes', () => {
  let app: TestApp
  let client: TestClient
  // Catalog record routes require contributor+ since the catalog-authz work;
  // record CRUD here runs as a contributor, deletes still require admin.
  let contributorToken: string

  beforeEach(async () => {
    ;({ app, client } = await createTestEnv())
    contributorToken = await setupAndLoginContributor(app, TEST_CREDENTIALS.contributor)
  })

  describe('POST /ingredients', () => {
    it('should create an ingredient with only a name', async () => {
      const token = contributorToken

      const res = await createIngredient(client, token, VALID_INGREDIENT)

      expectStatus(res, HTTP_STATUS.CREATED)
      const data = await res.json()
      if (!data.success) throw new Error('create failed')
      expect(data.data.id).toBeDefined()
      expect(data.data.name).toBe('Rétinol')
      expect(data.data.slug).toBe('retinol')
      expect(data.data.description).toBe('')
      expect(data.data.content).toBe('')
      expect(data.data.category).toBeNull()
    })

    it('should create an ingredient with all optional fields', async () => {
      const token = contributorToken

      const res = await createIngredient(client, token, {
        name: 'Acide Ascorbique',
        description: 'Forme pure de la vitamine C',
        content: '## Description\n\nActif antioxydant.',
        category: 'humectant',
      })

      expectStatus(res, HTTP_STATUS.CREATED)
      const data = await res.json()
      if (!data.success) throw new Error('create failed')
      expect(data.data.description).toBe('Forme pure de la vitamine C')
      expect(data.data.content).toBe('## Description\n\nActif antioxydant.')
      expect(data.data.category).toBe('humectant')
    })

    it('should auto-generate slug from name', async () => {
      const token = contributorToken

      const res = await createIngredient(client, token, { name: 'Acide Hyaluronique' })
      const data = await res.json()
      if (!data.success) throw new Error('create failed')

      expect(data.data.slug).toBe('acide-hyaluronique')
    })

    it('should use custom slug when provided by admin', async () => {
      // Custom slug requires the DB role to be admin; the JWT role must also be
      // admin to clear requireCatalogWrite, so log in as an admin from the start.
      const token = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      const res = await createIngredient(client, token, { name: 'Niacinamide', slug: 'niacin' })
      const data = await res.json()
      if (!data.success) throw new Error('create failed')

      expect(data.data.slug).toBe('niacin')
    })

    it('should NOT use custom slug when provided by non-admin', async () => {
      const token = contributorToken

      const res = await createIngredient(client, token, { name: 'Niacinamide', slug: 'niacin' })
      const data = await res.json()
      if (!data.success) throw new Error('create failed')

      expect(data.data.slug).toBe('niacinamide')
    })

    it('should return 409 for duplicate slug (admin)', async () => {
      // Duplicate-slug guard only triggers for admins (only they set slugs);
      // log in as admin so the JWT clears requireCatalogWrite too.
      const token = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      await createIngredient(client, token, { name: 'Magnésium', slug: 'magnesium' })
      const res = await createIngredient(client, token, {
        name: 'Magnésium Bis',
        slug: 'magnesium',
      })

      expectStatus(res, HTTP_STATUS.CONFLICT)
      const body = (await res.json()) as unknown as ApiErrorBody
      expect(body.success).toBe(false)
      expect(body.error).toBe('ingredient_already_exists')
    })

    it('should reject missing name', async () => {
      const token = contributorToken

      const res = await client.ingredients.$post(
        // @ts-expect-error — missing required name; testing schema rejection
        { json: { description: 'orphan' } },
        withAuth(token)
      )

      expectStatus(res, HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request('/api/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_INGREDIENT),
      })

      expectStatus(res, HTTP_STATUS.UNAUTHORIZED)
    })

    it('should reject request with invalid token', async () => {
      const res = await createIngredient(client, 'invalid.token.here', VALID_INGREDIENT)

      expectStatus(res, HTTP_STATUS.UNAUTHORIZED)
    })

    it('should reject invalid slug formats and malicious strings', async () => {
      const token = contributorToken
      const badSlugs = [
        'UPPERCASE',
        'with spaces',
        'multiple--hyphens',
        'trailing-hyphen-',
        '-leading-hyphen',
        'dot.in.slug',
        'under_score',

        'hello@world',
        'price$100',
        'tag#navigation',
        'search?q=test',
        'percent%20encoded',
        'back\\slash',
        'forward/slash',
        'pipe|line',
        'star*asterisk',

        '<script>alert(1)</script>',
        'javascript:alert(1)',
        '<img src=x onerror=alert(1)>',
        '"><script>confirm(1)</script>',

        "' OR '1'='1",
        "'; DROP TABLE ingredients; --",
        '1; SELECT * FROM users',
        'admin --',

        '../../etc/passwd',
        'C:\\Windows\\System32',
        '/root',
        '~/.ssh/id_rsa',

        'a'.repeat(101),
      ]

      for (const slug of badSlugs) {
        const res = await createIngredient(client, token, { name: 'Security Test', slug })
        expectStatus(res, HTTP_STATUS.BAD_REQUEST)
      }
    })
  })

  describe('role enforcement (records)', () => {
    it('201 for a plain user on POST /ingredients (guard swap: requireCatalogWrite removed)', async () => {
      const userToken = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const res = await createIngredient(client, userToken, VALID_INGREDIENT)
      expectStatus(res, HTTP_STATUS.CREATED)
    })

    it('201 for a contributor on POST /ingredients', async () => {
      const res = await createIngredient(client, contributorToken, VALID_INGREDIENT)
      expectStatus(res, HTTP_STATUS.CREATED)
    })
  })

  describe('GET /ingredients/:slug', () => {
    it('should return the ingredient by slug without auth', async () => {
      const token = contributorToken

      const createRes = await createIngredient(client, token, VALID_INGREDIENT)
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      const res = await client.ingredients[':slug'].$get({ param: { slug: created.slug } })

      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('get failed')
      expect(data.data.id).toBe(created.id)
      expect(data.data.slug).toBe(created.slug)
      expect(data.data.name).toBe('Rétinol')
    })

    it('should also work when authenticated', async () => {
      const token = contributorToken

      const createRes = await createIngredient(client, token, VALID_INGREDIENT)
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      const res = await client.ingredients[':slug'].$get(
        { param: { slug: created.slug } },
        withAuth(token)
      )

      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('get failed')
      expect(data.data.id).toBe(created.id)
    })

    it('should return 404 for unknown slug', async () => {
      const res = await client.ingredients[':slug'].$get({ param: { slug: 'slug-inexistant' } })

      expectStatus(res, HTTP_STATUS.NOT_FOUND)
      const body = (await res.json()) as unknown as ApiErrorBody
      expect(body.success).toBe(false)
      expect(body.error).toBe('ingredient_not_found')
    })
  })

  describe('GET /ingredients/by-slugs', () => {
    it('returns name+slug for known slugs and skips unknown ones', async () => {
      const token = contributorToken
      const a = await createIngredient(client, token, { name: 'Niacinamide' })
      const b = await createIngredient(client, token, { name: 'Rétinol' })
      const aData = await a.json()
      const bData = await b.json()
      if (!aData.success || !bData.success) throw new Error('create failed')
      const niac = aData.data
      const retinol = bData.data

      const res = await client.ingredients['by-slugs'].$get({
        query: { slugs: `${niac.slug},${retinol.slug},nope` },
      })

      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('by-slugs failed')
      const slugs = data.data.map((d) => d.slug).sort()
      expect(slugs).toEqual([niac.slug, retinol.slug].sort())
    })

    it('returns an empty list when slugs is comma-only', async () => {
      const res = await client.ingredients['by-slugs'].$get({ query: { slugs: ',,,' } })
      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('by-slugs failed')
      expect(data.data).toEqual([])
    })

    it('rejects when slugs param is missing', async () => {
      const res = await client.ingredients['by-slugs'].$get({
        // @ts-expect-error — missing required slugs; testing schema rejection
        query: {},
      })
      expectStatus(res, HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('PATCH /ingredients/:id', () => {
    it('should update ingredient fields', async () => {
      const token = contributorToken

      const createRes = await createIngredient(client, token, VALID_INGREDIENT)
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      const res = await client.ingredients[':id'].$patch(
        {
          param: { id: created.id },
          json: { description: 'Alternative naturelle au rétinol', category: 'actif' },
        },
        withAuth(token)
      )

      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('patch failed')
      expect(data.data.description).toBe('Alternative naturelle au rétinol')
      expect(data.data.category).toBe('actif')
      expect(data.data.name).toBe('Rétinol')
    })

    it('should not affect untouched fields', async () => {
      const token = contributorToken

      const createRes = await createIngredient(client, token, {
        ...VALID_INGREDIENT,
        content: 'Contenu initial',
      })
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      await client.ingredients[':id'].$patch(
        { param: { id: created.id }, json: { category: 'actif' } },
        withAuth(token)
      )

      const res = await client.ingredients[':slug'].$get({ param: { slug: created.slug } })
      const data = await res.json()
      if (!data.success) throw new Error('get failed')
      expect(data.data.content).toBe('Contenu initial')
    })

    it('should persist updates across requests', async () => {
      const token = contributorToken

      const createRes = await createIngredient(client, token, VALID_INGREDIENT)
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      await client.ingredients[':id'].$patch(
        { param: { id: created.id }, json: { description: 'Description persistée' } },
        withAuth(token)
      )

      const res = await client.ingredients[':slug'].$get({ param: { slug: created.slug } })
      const data = await res.json()
      if (!data.success) throw new Error('get failed')
      expect(data.data.description).toBe('Description persistée')
    })

    it('should keep the slug stable when the name changes (slug immutable, C-4)', async () => {
      const token = contributorToken

      const createRes = await createIngredient(client, token, { name: 'Vitamine E' })
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      const res = await client.ingredients[':id'].$patch(
        { param: { id: created.id }, json: { name: 'Vitamine E Tocopherol' } },
        withAuth(token)
      )
      const data = await res.json()
      if (!data.success) throw new Error('patch failed')
      expect(data.data.name).toBe('Vitamine E Tocopherol')
      expect(data.data.slug).toBe('vitamine-e')
    })

    it('should return 404 for unknown id', async () => {
      const token = contributorToken
      const fakeId = crypto.randomUUID()

      const res = await client.ingredients[':id'].$patch(
        { param: { id: fakeId }, json: { description: 'X' } },
        withAuth(token)
      )

      expectStatus(res, HTTP_STATUS.NOT_FOUND)
      const body = (await res.json()) as unknown as ApiErrorBody
      expect(body.error).toBe('ingredient_not_found')
    })

    it('should reject unknown fields (strict schema)', async () => {
      const token = contributorToken

      const createRes = await createIngredient(client, token, VALID_INGREDIENT)
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      const res = await client.ingredients[':id'].$patch(
        // @ts-expect-error — hackerField rejected by strict schema
        { param: { id: created.id }, json: { hackerField: 'oops' } },
        withAuth(token)
      )

      expectStatus(res, HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject unauthenticated request', async () => {
      const fakeId = crypto.randomUUID()
      const res = await app.request(`/api/ingredients/${fakeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'X' }),
      })

      expectStatus(res, HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('DELETE /ingredients/:id', () => {
    it('should delete the ingredient and return null data', async () => {
      const adminToken = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      const createRes = await createIngredient(client, contributorToken, VALID_INGREDIENT)
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      const res = await client.ingredients[':id'].$delete(
        { param: { id: created.id } },
        withAuth(adminToken)
      )

      expectStatus(res, 204)
    })

    it('should make the ingredient unreachable by slug after deletion', async () => {
      const adminToken = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      const createRes = await createIngredient(client, contributorToken, VALID_INGREDIENT)
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      await client.ingredients[':id'].$delete({ param: { id: created.id } }, withAuth(adminToken))

      const res = await client.ingredients[':slug'].$get({ param: { slug: created.slug } })
      expectStatus(res, HTTP_STATUS.NOT_FOUND)
    })

    it('should not affect other ingredients when deleting one', async () => {
      const adminToken = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      const r1 = await createIngredient(client, contributorToken, VALID_INGREDIENT)
      const r2 = await createIngredient(client, contributorToken, { name: 'Niacinamide' })

      const r1Data = await r1.json()
      const r2Data = await r2.json()
      if (!r1Data.success || !r2Data.success) throw new Error('create failed')
      const i1 = r1Data.data
      const i2 = r2Data.data

      await client.ingredients[':id'].$delete({ param: { id: i1.id } }, withAuth(adminToken))

      const res = await client.ingredients[':slug'].$get({ param: { slug: i2.slug } })
      expectStatus(res, HTTP_STATUS.OK)
    })

    it('should return 403 for a contributor (admin-only DELETE, route guard)', async () => {
      // requireAdmin on the DELETE route blocks a contributor with 'forbidden'
      // before the handler; the service unauthorized_access check is the backstop.
      const createRes = await createIngredient(client, contributorToken, VALID_INGREDIENT)
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      const res = await client.ingredients[':id'].$delete(
        { param: { id: created.id } },
        withAuth(contributorToken)
      )

      expectStatus(res, HTTP_STATUS.FORBIDDEN)
      const body = (await res.json()) as unknown as ApiErrorBody
      expect(body.error).toBe('forbidden')
    })

    it('should return 500 for unknown id (ingredient_delete_failed)', async () => {
      const adminToken = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)
      const fakeId = crypto.randomUUID()

      const res = await client.ingredients[':id'].$delete(
        { param: { id: fakeId } },
        withAuth(adminToken)
      )

      expectStatus(res, HTTP_STATUS.INTERNAL_SERVER_ERROR)
      const body = (await res.json()) as unknown as ApiErrorBody
      expect(body.error).toBe('ingredient_delete_failed')
    })

    it('should reject unauthenticated request', async () => {
      const fakeId = crypto.randomUUID()
      const res = await app.request(`/api/ingredients/${fakeId}`, { method: 'DELETE' })

      expectStatus(res, HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('GET /ingredients/:slug/edits', () => {
    it('should return an empty list for a new ingredient', async () => {
      const token = contributorToken

      const createRes = await createIngredient(client, token, VALID_INGREDIENT)
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      const res = await client.ingredients[':slug'].edits.$get({ param: { slug: created.slug } })

      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('edits failed')
      expect(data.data).toEqual([])
    })

    it('should return edits after an update without auth', async () => {
      const token = contributorToken

      const createRes = await createIngredient(client, token, VALID_INGREDIENT)
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      await client.ingredients[':id'].$patch(
        { param: { id: created.id }, json: { description: 'Première description' } },
        withAuth(token)
      )

      const res = await client.ingredients[':slug'].edits.$get({ param: { slug: created.slug } })

      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('edits failed')
      expect(data.data).toHaveLength(1)
      expect(data.data[0]?.ingredientId).toBe(created.id)
      expect(data.data[0]?.changes).toHaveProperty('description')
    })

    it('should return edits newest first', async () => {
      const token = contributorToken

      const createRes = await createIngredient(client, token, VALID_INGREDIENT)
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      await client.ingredients[':id'].$patch(
        { param: { id: created.id }, json: { description: 'Première description' } },
        withAuth(token)
      )
      await client.ingredients[':id'].$patch(
        { param: { id: created.id }, json: { content: 'Deuxième modification' } },
        withAuth(token)
      )

      const res = await client.ingredients[':slug'].edits.$get({ param: { slug: created.slug } })
      const data = await res.json()
      if (!data.success) throw new Error('edits failed')

      expect(data.data).toHaveLength(2)
      expect(data.data[0]?.changes).toHaveProperty('content')
      expect(data.data[1]?.changes).toHaveProperty('description')
    })

    it('should return 404 for unknown slug', async () => {
      const res = await client.ingredients[':slug'].edits.$get({
        param: { slug: 'slug-inexistant' },
      })

      expectStatus(res, HTTP_STATUS.NOT_FOUND)
    })

    it('should not return edits from other ingredients', async () => {
      const token = contributorToken

      const r1 = await createIngredient(client, token, VALID_INGREDIENT)
      const r2 = await createIngredient(client, token, { name: 'Niacinamide' })

      const r1Data = await r1.json()
      const r2Data = await r2.json()
      if (!r1Data.success || !r2Data.success) throw new Error('create failed')
      const i1 = r1Data.data
      const i2 = r2Data.data

      await client.ingredients[':id'].$patch(
        { param: { id: i1.id }, json: { description: 'Edit sur i1' } },
        withAuth(token)
      )

      const res = await client.ingredients[':slug'].edits.$get({ param: { slug: i2.slug } })
      const data = await res.json()
      if (!data.success) throw new Error('edits failed')
      expect(data.data).toHaveLength(0)
    })

    it('should record old and new values in changes', async () => {
      const token = contributorToken

      const createRes = await createIngredient(client, token, {
        name: 'Rétinol',
        description: 'Ancienne description',
      })
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      await client.ingredients[':id'].$patch(
        { param: { id: created.id }, json: { description: 'Nouvelle description' } },
        withAuth(token)
      )

      const res = await client.ingredients[':slug'].edits.$get({ param: { slug: created.slug } })
      const data = await res.json()
      if (!data.success) throw new Error('edits failed')

      const change = data.data[0]?.changes.description
      expect(change?.old).toBe('Ancienne description')
      expect(change?.new).toBe('Nouvelle description')
    })

    it('should not create an edit when values are unchanged', async () => {
      const token = contributorToken

      const createRes = await createIngredient(client, token, {
        name: 'Rétinol',
        description: 'Description inchangée',
      })
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      await client.ingredients[':id'].$patch(
        { param: { id: created.id }, json: { description: 'Description inchangée' } },
        withAuth(token)
      )

      const res = await client.ingredients[':slug'].edits.$get({ param: { slug: created.slug } })
      const data = await res.json()
      if (!data.success) throw new Error('edits failed')
      expect(data.data).toHaveLength(0)
    })

    it('should not track slug in edits when name changes', async () => {
      const token = contributorToken

      const createRes = await createIngredient(client, token, { name: 'Vitamine C' })
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      const patchRes = await client.ingredients[':id'].$patch(
        { param: { id: created.id }, json: { name: 'Vitamine C Pure' } },
        withAuth(token)
      )
      const patchData = await patchRes.json()
      if (!patchData.success) throw new Error('patch failed')
      const updated = patchData.data

      const res = await client.ingredients[':slug'].edits.$get({ param: { slug: updated.slug } })
      const data = await res.json()
      if (!data.success) throw new Error('edits failed')

      expect(data.data).toHaveLength(1)
      expect(data.data[0]?.changes).toHaveProperty('name')
      expect(data.data[0]?.changes).not.toHaveProperty('slug')
    })

    it('should record editedBy with the authenticated user id', async () => {
      const token = contributorToken

      const profileRes = await client.profile.$get({}, withAuth(token))
      const profileData = await profileRes.json()
      if (!profileData.success) throw new Error('profile fetch failed')
      const profile = profileData.data

      const createRes = await createIngredient(client, token, VALID_INGREDIENT)
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create failed')
      const created = createData.data

      await client.ingredients[':id'].$patch(
        { param: { id: created.id }, json: { description: 'Edit tracée' } },
        withAuth(token)
      )

      const res = await client.ingredients[':slug'].edits.$get({ param: { slug: created.slug } })
      const data = await res.json()
      if (!data.success) throw new Error('edits failed')

      expect(data.data[0]?.editedBy).toBe(profile.userId)
    })
  })
})
