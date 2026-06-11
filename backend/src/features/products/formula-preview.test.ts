import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import { normalize, splitINCI, stripPreamble } from 'algo-derm'
import { buildAliasIndex, lookupIngredient, MERGED_EVIDENCE_DB } from 'algo-derm/engine'
import { eq } from 'drizzle-orm'

import { ingredients } from '../../db/schema/ingredients/ingredients'
import { testDb } from '../../tests/db.test.config'
import { createTestEnv, withAuth } from '../../tests/helpers/createTestClient'
import { cleanDatabase } from '../../tests/helpers/db-cleaner'
import { setupAndLoginContributor } from '../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../tests/helpers/test-credentials'
import { createTestUser } from '../../tests/helpers/test-factories'

// Canonical key for niacinamide, resolved once at module load (same algo as service).
const aliasIndex = buildAliasIndex(MERGED_EVIDENCE_DB)
const NIACINAMIDE_KEY = lookupIngredient('niacinamide', aliasIndex)?.inci ?? null
if (!NIACINAMIDE_KEY)
  throw new Error('algo-derm has no entry for niacinamide — check vendor tarball')

const VALID_PREVIEW_BODY = {
  inci: 'Aqua, Niacinamide, Glycerin',
  category: 'skincare' as const,
  kind: 'serum',
}

describe('POST /products/formula-preview', () => {
  let token: string

  beforeEach(async () => {
    await cleanDatabase()
    const env = await createTestEnv()
    token = await setupAndLoginContributor(env.app, TEST_CREDENTIALS.contributor)
  })

  it('returns 401 when unauthenticated', async () => {
    const env = await createTestEnv()
    const res = await env.client.products['formula-preview'].$post({ json: VALID_PREVIEW_BODY })
    expect(res.status as number).toBe(HTTP_STATUS.UNAUTHORIZED)
  })

  it('returns 400 for empty inci string', async () => {
    const env = await createTestEnv()
    const res = await env.client.products['formula-preview'].$post(
      { json: { ...VALID_PREVIEW_BODY, inci: '' } as never },
      withAuth(token)
    )
    expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  it('returns 400 when kind is not valid for the given category', async () => {
    const env = await createTestEnv()
    const res = await env.client.products['formula-preview'].$post(
      { json: { ...VALID_PREVIEW_BODY, kind: 'shampoo' } as never },
      withAuth(token)
    )
    expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  describe('200 happy path', () => {
    it('preserves INCI order and matches niacinamide to the fixture row', async () => {
      // Insert an ingredient fixture whose canonical_key matches algo-derm's resolution
      // for 'niacinamide', so the assertion is self-contained (no seed dependency).
      const systemUser = await createTestUser('system-nici@preview.test')
      await testDb.insert(ingredients).values({
        createdBy: systemUser.id,
        name: 'Niacinamide',
        slug: 'niacinamide-preview-fixture',
        type: 'skincare',
        canonicalKey: NIACINAMIDE_KEY,
      })
      // Fetch the inserted row to get the auto-generated id.
      const [inserted] = await testDb
        .select({ id: ingredients.id })
        .from(ingredients)
        .where(eq(ingredients.slug, 'niacinamide-preview-fixture'))
        .limit(1)
      if (!inserted) throw new Error('fixture insert failed')

      const env = await createTestEnv()
      const res = await env.client.products['formula-preview'].$post(
        { json: { inci: 'Niacinamide, Glycerin', category: 'skincare', kind: 'serum' } },
        withAuth(token)
      )

      expect(res.status as number).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('preview failed')

      const { tokens } = data.data

      // Order must follow the INCI string order.
      expect(tokens[0]?.raw).toContain('Niacinamide')
      expect(tokens[1]?.raw).toContain('Glycerin')

      // Niacinamide token must link to our fixture row.
      const niciToken = tokens.find((t) => t.canonicalKey === NIACINAMIDE_KEY)
      expect(niciToken).toBeDefined()
      expect(niciToken?.ingredient?.id).toBe(inserted.id)
      expect(niciToken?.ingredient?.name).toBe('Niacinamide')

      // Unknown token (Glycerin, no fixture) → canonicalKey may or may not resolve,
      // but ingredient must be null since we inserted nothing for it.
      const glycerinToken = tokens.find((t) => normalize(t.raw) === normalize('Glycerin'))
      expect(glycerinToken?.ingredient).toBeNull()
    })

    it('returns normalized form for each token', async () => {
      const env = await createTestEnv()
      const res = await env.client.products['formula-preview'].$post(
        { json: VALID_PREVIEW_BODY },
        withAuth(token)
      )
      const data = await res.json()
      if (!data.success) throw new Error('preview failed')

      // Every token must carry a normalized form (may be empty string for parse edge cases).
      const rawTokens = splitINCI(stripPreamble(VALID_PREVIEW_BODY.inci))
      expect(data.data.tokens).toHaveLength(rawTokens.length)
      for (const t of data.data.tokens) {
        expect(t).toHaveProperty('raw')
        expect(t).toHaveProperty('normalized')
        expect(t).toHaveProperty('canonicalKey')
        expect(t).toHaveProperty('ingredient')
      }
    })

    it('returns suggestedTags array and autoTagEligible=true for skincare serum', async () => {
      const env = await createTestEnv()
      const res = await env.client.products['formula-preview'].$post(
        { json: VALID_PREVIEW_BODY },
        withAuth(token)
      )
      const data = await res.json()
      if (!data.success) throw new Error('preview failed')

      expect(data.data.autoTagEligible).toBe(true)
      expect(Array.isArray(data.data.suggestedTags)).toBe(true)

      // Each tag pair must carry the three required fields.
      for (const tag of data.data.suggestedTags) {
        expect(tag).toHaveProperty('tagSlug')
        expect(tag).toHaveProperty('relevance')
        expect(tag).toHaveProperty('source')
        expect(['primary', 'secondary', 'avoid']).toContain(tag.relevance)
      }
    })

    it('returns autoTagEligible=false and suggestedTags=[] for dental category', async () => {
      const env = await createTestEnv()
      const res = await env.client.products['formula-preview'].$post(
        {
          json: {
            inci: 'Aqua, Sorbitol, Glycerin',
            category: 'dental' as const,
            kind: 'toothpaste',
          },
        },
        withAuth(token)
      )
      const data = await res.json()
      if (!data.success) throw new Error('preview failed')

      expect(data.data.autoTagEligible).toBe(false)
      expect(data.data.suggestedTags).toEqual([])
    })
  })
})
