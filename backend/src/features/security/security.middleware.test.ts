import { describe, expect, test } from 'bun:test'

import { scanBody } from './security.middleware'

describe('scanBody recursion', () => {
  test('detects HTML injection in a nested object field', () => {
    const d = scanBody({ profile: { bio: '<script>alert(1)</script>' } })
    expect(d).toHaveLength(1)
    expect(d[0]).toMatchObject({
      field: 'profile.bio',
      eventType: 'html_injection',
      severity: 'high',
    })
  })

  test('detects a malicious URL inside an array of objects', () => {
    const d = scanBody({ links: [{ url: 'javascript:alert(1)' }] })
    expect(d).toHaveLength(1)
    expect(d[0]).toMatchObject({
      field: 'links.0.url',
      eventType: 'malicious_url',
      severity: 'high',
    })
  })

  test('still scans top-level string fields', () => {
    const d = scanBody({ name: '<b>x</b>' })
    expect(d).toHaveLength(1)
    expect(d[0]).toMatchObject({ field: 'name', eventType: 'html_injection' })
  })
})
