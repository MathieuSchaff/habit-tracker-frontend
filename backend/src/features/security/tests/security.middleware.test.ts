import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { setupDbTests } from '../../../tests/db-setup'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import { authPost, setupAndLoginContributor } from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

const VALID_PRODUCT = {
  name: 'Sérum Test',
  brand: 'TestBrand',
  category: 'skincare',
  kind: 'serum',
  unit: 'pump',
}

async function postProduct(app: Hono<AppEnv>, token: string, body: object) {
  return authPost(app, '/api/products', token, body)
}

setupDbTests()

describe('Security Middleware — product routes', () => {
  let app: Hono<AppEnv>
  let token: string

  beforeEach(async () => {
    app = await createTestApp()
    // Product creation requires contributor+ (catalog-authz); the security
    // middleware under test runs regardless of role.
    token = await setupAndLoginContributor(app, TEST_CREDENTIALS.contributor)
  })

  describe('detection', () => {
    it('blocks javascript: URL on first attempt (403)', async () => {
      const res = await postProduct(app, token, {
        ...VALID_PRODUCT,
        url: 'javascript:alert(document.cookie)',
      })
      expect(res.status).toBe(403)
      const data = (await res.json()) as { success: false; error: string }
      expect(data.success).toBe(false)
      expect(data.error).toBe('forbidden')
    })

    it('blocks data:text/html URL on first attempt (403)', async () => {
      const res = await postProduct(app, token, {
        ...VALID_PRODUCT,
        url: 'data:text/html,<script>alert(1)</script>',
      })
      expect(res.status).toBe(403)
    })

    it('blocks HTML in inci on first attempt (403)', async () => {
      const res = await postProduct(app, token, {
        ...VALID_PRODUCT,
        inci: '<script>alert(1)</script>',
      })
      expect(res.status).toBe(403)
    })

    it('allows http:// URL through (LOW event logged, not blocked)', async () => {
      const res = await postProduct(app, token, {
        ...VALID_PRODUCT,
        url: 'http://example.com',
      })
      expect(res.status).toBe(HTTP_STATUS.CREATED)
    })

    it('passes valid product through', async () => {
      const res = await postProduct(app, token, VALID_PRODUCT)
      expect(res.status).toBe(HTTP_STATUS.CREATED)
    })

    it('passes valid product with https URL through', async () => {
      const res = await postProduct(app, token, {
        ...VALID_PRODUCT,
        url: 'https://example.com',
      })
      expect(res.status).toBe(HTTP_STATUS.CREATED)
    })
  })

  describe('Content-Type bypass', () => {
    it('blocks HIGH detection even when Content-Type is text/plain', async () => {
      const res = await app.request('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...VALID_PRODUCT, url: 'javascript:alert(1)' }),
      })
      expect(res.status).toBe(403)
    })

    it('blocks HIGH detection even when Content-Type is missing', async () => {
      const res = await app.request('/api/products', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...VALID_PRODUCT, inci: '<script>1</script>' }),
      })
      expect(res.status).toBe(403)
    })
  })

  describe('repeat-offender fast-path', () => {
    it('low-severity events do not contribute to the block', async () => {
      for (let i = 0; i < 5; i++) {
        await postProduct(app, token, {
          name: `Produit ${i}`,
          brand: 'TestBrand',
          category: 'skincare',
          kind: 'serum',
          unit: 'pump',
          url: 'http://example.com',
        })
      }

      const res = await postProduct(app, token, { ...VALID_PRODUCT, name: 'Produit Final' })
      expect(res.status).toBe(HTTP_STATUS.CREATED)
    })
  })
})
