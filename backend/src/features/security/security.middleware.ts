import { sanitizeUrl } from '@braintree/sanitize-url'
import type { Context, Next } from 'hono'

import type { AppEnv } from '../../app-env'
import { isUserBlocked, logSecurityEvent } from './security.service'

// Fields that hold user-supplied URLs.
const URL_FIELDS = new Set(['url', 'imageUrl', 'avatarUrl', 'coverImageUrl'])

interface Detection {
  field: string
  payload: string
  eventType: string
  severity: 'high' | 'low'
}

function scanBody(body: unknown, prefix = ''): Detection[] {
  if (!body || typeof body !== 'object') return []
  const detections: Detection[] = []

  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (typeof value !== 'string') continue

    const field = prefix ? `${prefix}.${key}` : key

    // HIGH — dangerous URL protocol in a URL field (javascript:, vbscript:, data:, encoded
    // variants…). sanitizeUrl returns 'about:blank' for anything it considers unsafe,
    // covering edge cases our regex would miss (&#106;avascript:, java\nscript:, etc.).
    if (URL_FIELDS.has(key) && sanitizeUrl(value) === 'about:blank') {
      detections.push({ field, payload: value, eventType: 'malicious_url', severity: 'high' })
      continue
    }

    // HIGH — HTML tags in any field (covers inci, name, description…)
    if (/<[a-z][^>]*>/i.test(value)) {
      detections.push({ field, payload: value, eventType: 'html_injection', severity: 'high' })
      continue
    }

    // LOW — http:// instead of https:// in URL fields
    if (URL_FIELDS.has(key) && /^http:\/\//i.test(value)) {
      detections.push({ field, payload: value, eventType: 'http_url', severity: 'low' })
    }
  }

  return detections
}

export function securityScan() {
  return async (c: Context<AppEnv>, next: Next) => {
    const userId = c.get('userId')
    if (!userId) return next()

    const contentType = c.req.header('content-type') ?? ''
    if (!contentType.includes('application/json')) return next()

    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return next()
    }

    const detections = scanBody(body)
    if (detections.length === 0) return next()

    const db = c.get('db')
    const route = c.req.path

    // Log all detections, check block only on HIGH
    const hasHigh = detections.some((d) => d.severity === 'high')

    await Promise.allSettled(detections.map((d) => logSecurityEvent(db, { userId, route, ...d })))

    if (hasHigh && (await isUserBlocked(db, userId))) {
      return c.json({ success: false, error: 'forbidden' }, 403)
    }

    return next()
  }
}
