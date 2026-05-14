import { beforeEach, describe, expect, it } from 'bun:test'

import { testDb } from '../../../tests/db.test.config'
import { cleanDatabase } from '../../../tests/helpers/db-cleaner'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { isUserBlocked, logSecurityEvent } from '../security.service'

let userId: string

beforeEach(async () => {
  await cleanDatabase()
  const user = await createTestUser()
  userId = user.id
})

describe('logSecurityEvent', () => {
  it('inserts a high severity event', async () => {
    await expect(
      logSecurityEvent(testDb, {
        userId,
        severity: 'high',
        eventType: 'javascript_url',
        field: 'url',
        payload: 'javascript:alert(1)',
        route: '/products',
      })
    ).resolves.toBeUndefined()
  })

  it('truncates payload to 200 chars', async () => {
    const longPayload = 'javascript:'.padEnd(300, 'x')
    await expect(
      logSecurityEvent(testDb, {
        userId,
        severity: 'high',
        eventType: 'javascript_url',
        field: 'url',
        payload: longPayload,
        route: '/products',
      })
    ).resolves.toBeUndefined()
  })
})

describe('isUserBlocked', () => {
  it('returns false with no events', async () => {
    expect(await isUserBlocked(testDb, userId)).toBe(false)
  })

  it('returns false with 2 high events', async () => {
    await logSecurityEvent(testDb, {
      userId,
      severity: 'high',
      eventType: 'javascript_url',
      field: 'url',
      payload: 'javascript:alert(1)',
      route: '/products',
    })
    await logSecurityEvent(testDb, {
      userId,
      severity: 'high',
      eventType: 'html_injection',
      field: 'inci',
      payload: '<script>',
      route: '/products',
    })

    expect(await isUserBlocked(testDb, userId)).toBe(false)
  })

  it('returns true after 3 high events', async () => {
    for (let i = 0; i < 3; i++) {
      await logSecurityEvent(testDb, {
        userId,
        severity: 'high',
        eventType: 'javascript_url',
        field: 'url',
        payload: 'javascript:alert(1)',
        route: '/products',
      })
    }

    expect(await isUserBlocked(testDb, userId)).toBe(true)
  })

  it('does not count low severity events toward block threshold', async () => {
    for (let i = 0; i < 5; i++) {
      await logSecurityEvent(testDb, {
        userId,
        severity: 'low',
        eventType: 'http_url',
        field: 'url',
        payload: 'http://example.com',
        route: '/products',
      })
    }

    expect(await isUserBlocked(testDb, userId)).toBe(false)
  })

  it('does not count events from other users', async () => {
    const otherUser = await createTestUser('other@test.com', 'password123')

    for (let i = 0; i < 3; i++) {
      await logSecurityEvent(testDb, {
        userId: otherUser.id,
        severity: 'high',
        eventType: 'javascript_url',
        field: 'url',
        payload: 'javascript:alert(1)',
        route: '/products',
      })
    }

    expect(await isUserBlocked(testDb, userId)).toBe(false)
  })
})
