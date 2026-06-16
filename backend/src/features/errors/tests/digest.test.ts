import { afterEach, describe, expect, it } from 'bun:test'

import { errorGroups, errorOccurrences } from '../../../db/schema'
import { testDb } from '../../../tests/db.test.config'
import { setupDbTests } from '../../../tests/db-setup'
import { buildDigestEmail, sendErrorDigest } from '../digest'
import { getNewErrorGroupsSince } from '../service'

setupDbTests()

const NOW = new Date('2026-06-16T12:00:00.000Z')
const hoursAgo = (h: number): string => new Date(NOW.getTime() - h * 3_600_000).toISOString()
const SINCE = hoursAgo(24)

afterEach(async () => {
  await testDb.delete(errorOccurrences)
  await testDb.delete(errorGroups)
})

describe('error digest — getNewErrorGroupsSince', () => {
  it('returns only in-window unresolved groups, most occurrences first', async () => {
    await testDb.insert(errorGroups).values([
      {
        fingerprint: 'in-low',
        source: 'backend',
        message: 'recent low',
        count: 5,
        firstSeenAt: hoursAgo(1),
        lastSeenAt: hoursAgo(1),
      },
      {
        fingerprint: 'in-high',
        source: 'frontend',
        message: 'recent high',
        count: 12,
        firstSeenAt: hoursAgo(10),
        lastSeenAt: hoursAgo(1),
      },
      {
        fingerprint: 'too-old',
        source: 'backend',
        message: 'first seen before the window',
        count: 99,
        firstSeenAt: hoursAgo(30),
        lastSeenAt: hoursAgo(30),
      },
      {
        fingerprint: 'resolved',
        source: 'backend',
        message: 'already triaged',
        count: 7,
        firstSeenAt: hoursAgo(2),
        lastSeenAt: hoursAgo(2),
        resolvedAt: hoursAgo(1),
      },
    ])

    const groups = await getNewErrorGroupsSince(testDb, SINCE)

    expect(groups.map((g) => g.message)).toEqual(['recent high', 'recent low'])
  })
})

describe('error digest — sendErrorDigest', () => {
  it('does not send when no new groups (no empty mail)', async () => {
    await testDb.insert(errorGroups).values({
      fingerprint: 'too-old',
      source: 'backend',
      message: 'first seen before the window',
      count: 1,
      firstSeenAt: hoursAgo(30),
      lastSeenAt: hoursAgo(30),
    })

    let calls = 0
    const result = await sendErrorDigest(testDb, {
      now: NOW,
      recipient: 'ops@aurore.test',
      send: async () => {
        calls++
      },
    })

    expect(result).toEqual({ sent: false, count: 0, reason: 'no-new-errors' })
    expect(calls).toBe(0)
  })

  it('sends one mail summarizing the new groups', async () => {
    await testDb.insert(errorGroups).values([
      {
        fingerprint: 'a',
        source: 'backend',
        message: 'boom',
        count: 3,
        firstSeenAt: hoursAgo(2),
        lastSeenAt: hoursAgo(1),
      },
      {
        fingerprint: 'b',
        source: 'frontend',
        message: 'kaboom',
        count: 8,
        firstSeenAt: hoursAgo(5),
        lastSeenAt: hoursAgo(1),
      },
    ])

    const sent: { to: string; subject: string; html: string }[] = []
    const result = await sendErrorDigest(testDb, {
      now: NOW,
      recipient: 'ops@aurore.test',
      send: async (msg) => {
        sent.push(msg)
      },
    })

    expect(result).toEqual({ sent: true, count: 2 })
    expect(sent.length).toBe(1)
    expect(sent[0]?.to).toBe('ops@aurore.test')
    expect(sent[0]?.subject).toContain('2')
    expect(sent[0]?.html).toContain('boom')
    expect(sent[0]?.html).toContain('kaboom')
  })
})

describe('error digest — buildDigestEmail', () => {
  it('escapes HTML in error messages', () => {
    const { html } = buildDigestEmail([
      {
        id: '1',
        source: 'frontend',
        message: '<script>alert(1)</script>',
        count: 1,
        affectedUsers: 0,
        firstSeenAt: hoursAgo(1),
      },
    ])

    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('pluralizes the subject by group count', () => {
    const base = {
      source: 'backend' as const,
      count: 1,
      affectedUsers: 0,
      firstSeenAt: hoursAgo(1),
    }
    const one = buildDigestEmail([{ ...base, id: '1', message: 'x' }])
    const two = buildDigestEmail([
      { ...base, id: '1', message: 'x' },
      { ...base, id: '2', message: 'y' },
    ])

    expect(one.subject).toContain('1 nouveau groupe')
    expect(two.subject).toContain('2 nouveaux groupes')
  })
})
