import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import { authPostMultipart, setupAndLogin } from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

function buildVp8l(width: number, height: number, padBytes: number): Buffer {
  const w = width - 1
  const h = height - 1
  const bits = w | (h << 14)
  const payload = Buffer.alloc(5 + padBytes)
  payload[0] = 0x2f
  payload[1] = bits & 0xff
  payload[2] = (bits >> 8) & 0xff
  payload[3] = (bits >> 16) & 0xff
  payload[4] = (bits >> 24) & 0xff
  const chunkHeader = Buffer.from('VP8L', 'ascii')
  const chunkSize = Buffer.alloc(4)
  chunkSize.writeUInt32LE(payload.length, 0)
  const riffPayload = Buffer.concat([Buffer.from('WEBP', 'ascii'), chunkHeader, chunkSize, payload])
  const riffSize = Buffer.alloc(4)
  riffSize.writeUInt32LE(riffPayload.length, 0)
  return Buffer.concat([Buffer.from('RIFF', 'ascii'), riffSize, riffPayload])
}

describe('Upload Routes', () => {
  let app: Hono<AppEnv>
  const ORIGINAL_FETCH = globalThis.fetch
  let bunnyMock: ReturnType<typeof mock>

  beforeEach(async () => {
    app = await createTestApp()
    bunnyMock = mock(async () => new Response(null, { status: 201 }))
    globalThis.fetch = bunnyMock as unknown as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH
  })

  describe('POST /api/uploads/avatar', () => {
    it('rejects unauthenticated requests', async () => {
      const res = await app.request('/api/uploads/avatar', { method: 'POST' })
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('uploads a valid 1024×1024 WebP and updates user', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const buf = buildVp8l(1024, 1024, 100)
      const blob = new Blob([buf], { type: 'image/webp' })
      const res = await authPostMultipart(app, '/api/uploads/avatar', token, {
        image: blob,
      })
      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.url).toMatch(/^https:\/\/.+\/avatars\/.+\.webp\?v=\d+$/)
      expect(bunnyMock).toHaveBeenCalledTimes(1)
    })

    it('rejects wrong magic bytes', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const blob = new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])], {
        type: 'image/webp',
      })
      const res = await authPostMultipart(app, '/api/uploads/avatar', token, {
        image: blob,
      })
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      const body = await res.json()
      expect(body.error).toBe('upload_invalid_format')
    })

    it('rejects wrong dimensions', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const buf = buildVp8l(800, 800, 50)
      const blob = new Blob([buf], { type: 'image/webp' })
      const res = await authPostMultipart(app, '/api/uploads/avatar', token, {
        image: blob,
      })
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      const body = await res.json()
      expect(body.error).toBe('upload_invalid_dimensions')
    })
  })

  describe('POST /api/uploads/product/:slug', () => {
    it('returns 404 for unknown slug', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const buf = buildVp8l(1200, 1200, 100)
      const blob = new Blob([buf], { type: 'image/webp' })
      const res = await authPostMultipart(app, '/api/uploads/product/no-such-slug', token, {
        image: blob,
      })
      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })

    it('returns 404 for unknown slug even when payload is invalid', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      // PNG header — would fail validation
      const blob = new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])], {
        type: 'image/webp',
      })
      const res = await authPostMultipart(app, '/api/uploads/product/no-such-slug', token, {
        image: blob,
      })
      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })
})
