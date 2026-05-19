import { beforeEach, describe, expect, it } from 'bun:test'

import {
  checkExportRateLimit,
  EXPORT_COOLDOWN_MS,
  exportFilename,
  resetExportRateLimit,
} from '../export.service'

describe('export helpers', () => {
  beforeEach(() => {
    resetExportRateLimit()
  })

  describe('exportFilename', () => {
    it('embeds the user id and an ISO yyyymmdd date', () => {
      // Date.UTC, not new Date(yyyy, mm, dd): the formatter uses UTC accessors
      // to avoid CI-vs-local timezone drift in the date suffix.
      const fixed = new Date(Date.UTC(2026, 4, 19, 10))
      expect(exportFilename('11111111-1111-1111-1111-111111111111', fixed)).toBe(
        'aurore-export-11111111-1111-1111-1111-111111111111-20260519.json'
      )
    })

    it('pads single-digit month and day', () => {
      const fixed = new Date(Date.UTC(2026, 0, 2, 0))
      expect(exportFilename('u1', fixed)).toBe('aurore-export-u1-20260102.json')
    })
  })

  describe('checkExportRateLimit', () => {
    it('lets the first call through and stamps the user', () => {
      expect(checkExportRateLimit('user-1', 1_000)).toEqual({ ok: true })
    })

    it('rejects a second call inside the cooldown window with retry-after', () => {
      checkExportRateLimit('user-1', 1_000)
      const r = checkExportRateLimit('user-1', 1_000 + 60_000)
      expect(r.ok).toBe(false)
      // 5 min - 1 min already elapsed → ~240 s
      if (!r.ok) expect(r.retryAfterSec).toBe(240)
    })

    it('lets the next call through once the cooldown elapses', () => {
      checkExportRateLimit('user-1', 1_000)
      const r = checkExportRateLimit('user-1', 1_000 + EXPORT_COOLDOWN_MS)
      expect(r).toEqual({ ok: true })
    })

    it('tracks cooldown per user independently', () => {
      checkExportRateLimit('user-1', 1_000)
      expect(checkExportRateLimit('user-2', 1_000)).toEqual({ ok: true })
    })
  })
})
