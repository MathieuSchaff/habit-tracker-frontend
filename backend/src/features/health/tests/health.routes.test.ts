import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { createTestApp } from '../../../tests/helpers/createTestApp'

describe('Health Routes', () => {
  let app: Hono<AppEnv>

  beforeEach(async () => {
    app = await createTestApp()
  })

  describe('GET /health', () => {
    it('should return 200 with success', async () => {
      const res = await app.request('/health')

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toBe(true)
    })

    it('should not require authentication', async () => {
      const res = await app.request('/health')
      expect(res.status).toBe(HTTP_STATUS.OK)
    })
  })
})
