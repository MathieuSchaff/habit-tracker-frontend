import { describe, expect, test } from 'bun:test'

import type { Context } from 'hono'

import { clientIp } from './clientIp'

function ctx(headers: Record<string, string>): Context {
  return {
    req: { header: (name: string) => headers[name.toLowerCase()] },
  } as unknown as Context
}

describe('clientIp', () => {
  test('prefers nginx-set X-Real-IP over a spoofed X-Forwarded-For', () => {
    const ip = clientIp(
      ctx({ 'x-real-ip': '203.0.113.5', 'x-forwarded-for': '1.2.3.4, 203.0.113.5' })
    )
    expect(ip).toBe('203.0.113.5')
  })

  test('uses the rightmost XFF hop (nginx-appended peer), not the client-controlled leftmost', () => {
    const ip = clientIp(ctx({ 'x-forwarded-for': 'evil-spoof, 203.0.113.5' }))
    expect(ip).toBe('203.0.113.5')
  })

  test('falls back to unknown with no trusted headers', () => {
    expect(clientIp(ctx({}))).toBe('unknown')
  })
})
