import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import { authPost, setupAndLogin } from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

const VALID_PRODUCT = {
  name: 'Sérum Test',
  brand: 'TestBrand',
  category: 'skincare',
  kind: 'serum',
  unit: 'pump',
}

async function postProduct(app: Hono<AppEnv>, token: string, body: object) {
  return authPost(app, '/products', token, body)
}

describe('Security Middleware — product routes', () => {
  let app: Hono<AppEnv>
  let token: string

  beforeEach(async () => {
    app = await createTestApp()
    token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
  })

  describe('detection', () => {
    it('rejects javascript: URL (400 from Zod, event logged)', async () => {
      const res = await postProduct(app, token, {
        ...VALID_PRODUCT,
        url: 'javascript:alert(document.cookie)',
      })
      // Zod rejects the URL — middleware logs but passes through to Zod
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('rejects data:text/html URL (400 from Zod, event logged)', async () => {
      const res = await postProduct(app, token, {
        ...VALID_PRODUCT,
        url: 'data:text/html,<script>alert(1)</script>',
      })
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('rejects HTML in inci (400 from Zod, event logged)', async () => {
      const res = await postProduct(app, token, {
        ...VALID_PRODUCT,
        inci: '<script>alert(1)</script>',
      })
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('allows http:// URL through (LOW event logged, not blocked)', async () => {
      // safeUrl allows http:// — only javascript: / data: are blocked at schema level.
      // The middleware logs a LOW severity event but does not reject the request.
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

  describe('auto-block after 3 high-severity attempts', () => {
    it('returns 403 on 3rd high-severity attempt', async () => {
      // Attempts 1 and 2 — logged but not yet blocked
      await postProduct(app, token, { ...VALID_PRODUCT, url: 'javascript:alert(1)' })
      await postProduct(app, token, { ...VALID_PRODUCT, url: 'javascript:alert(2)' })

      // 3rd attempt — middleware logs (total = 3), then checks blocked (3 >= 3) → 403
      const res = await postProduct(app, token, { ...VALID_PRODUCT, url: 'javascript:alert(3)' })
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('forbidden')
    })

    it('low-severity events do not contribute to the block', async () => {
      // 5 http:// attempts (LOW) — pass through, logged but never trigger block
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

      // A valid subsequent request still goes through (not blocked)
      const res = await postProduct(app, token, { ...VALID_PRODUCT, name: 'Produit Final' })
      expect(res.status).toBe(HTTP_STATUS.CREATED)
    })
  })
})
