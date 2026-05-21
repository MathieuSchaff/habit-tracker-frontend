import { beforeAll, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import { setupDbTests } from '../../../tests/db-setup'
import { createTestClient, type TestClient } from '../../../tests/helpers/createTestClient'

setupDbTests()

describe('Health Routes', () => {
  let client: TestClient

  beforeAll(async () => {
    client = await createTestClient()
  })

  describe('GET /health', () => {
    it('should return 200 with success', async () => {
      const res = await client.health.$get()

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('health failed')
      expect(data.data).toBe(true)
    })

    it('should not require authentication', async () => {
      const res = await client.health.$get()
      expect(res.status).toBe(HTTP_STATUS.OK)
    })
  })
})
