import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { errorGroups, errorOccurrences } from '../../../db/schema'
import { testDb } from '../../../tests/db.test.config'
import { createTestApp } from '../../../tests/helpers/createTestApp'

describe('POST /errors', () => {
  let app: Hono<AppEnv>

  beforeEach(async () => {
    app = await createTestApp()
    await testDb.delete(errorOccurrences)
    await testDb.delete(errorGroups)
  })

  afterEach(async () => {
    await testDb.delete(errorOccurrences)
    await testDb.delete(errorGroups)
  })

  it('returns 200 and stores the error', async () => {
    const res = await app.request('/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'frontend',
        message: 'TypeError: Cannot read properties of null',
        stack: 'TypeError: Cannot read properties of null\n    at ProfilePage.tsx:42:10',
        context: { url: 'https://app.local/profile' },
      }),
    })

    expect(res.status).toBe(HTTP_STATUS.OK)
    const groups = await testDb.select().from(errorGroups)
    expect(groups).toHaveLength(1)
    expect(groups[0].count).toBe(1)
    expect(groups[0].source).toBe('frontend')
  })

  it('deduplicates: same error increments count', async () => {
    const payload = {
      source: 'frontend',
      message: 'TypeError: Cannot read properties of null',
      stack: 'TypeError: Cannot read properties of null\n    at ProfilePage.tsx:42:10',
    }

    await app.request('/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    await app.request('/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const groups = await testDb.select().from(errorGroups)
    expect(groups).toHaveLength(1)
    expect(groups[0].count).toBe(2)

    const occurrences = await testDb.select().from(errorOccurrences)
    expect(occurrences).toHaveLength(2)
  })

  it('returns 400 for invalid payload', async () => {
    const res = await app.request('/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'unknown', message: '' }),
    })

    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
  })
})
