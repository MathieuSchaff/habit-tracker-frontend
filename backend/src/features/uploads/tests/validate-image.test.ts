import { describe, expect, it } from 'bun:test'

import { UploadError } from '../upload-error'
import { validateWebpUpload } from '../validate-image'

// Build a minimal VP8L (lossless) WebP with given canvas size.
// VP8L payload layout: 0x2f signature + 4 packed bytes encoding ((h-1)<<14)|(w-1).
function buildVp8l(width: number, height: number, padBytes: number): Buffer {
  const w = width - 1
  const h = height - 1
  const bits = w | (h << 14)
  const sig = 0x2f
  const payload = Buffer.alloc(5 + padBytes)
  payload[0] = sig
  payload[1] = bits & 0xff
  payload[2] = (bits >> 8) & 0xff
  payload[3] = (bits >> 16) & 0xff
  payload[4] = (bits >> 24) & 0xff
  const chunkHeader = Buffer.from('VP8L', 'ascii')
  const chunkSize = Buffer.alloc(4)
  chunkSize.writeUInt32LE(payload.length, 0)
  const riffPayload = Buffer.concat([Buffer.from('WEBP', 'ascii'), chunkHeader, chunkSize, payload])
  const riff = Buffer.from('RIFF', 'ascii')
  const riffSize = Buffer.alloc(4)
  riffSize.writeUInt32LE(riffPayload.length, 0)
  return Buffer.concat([riff, riffSize, riffPayload])
}

// Build a minimal VP8 (lossy) WebP. Frame header at bytes 23..29:
// start code 0x9d 0x01 0x2a, then 14-bit width (LE), 14-bit height (LE).
function buildVp8Lossy(width: number, height: number, padBytes: number): Buffer {
  const payload = Buffer.alloc(13 + padBytes)
  payload[3] = 0x9d
  payload[4] = 0x01
  payload[5] = 0x2a
  payload[6] = width & 0xff
  payload[7] = (width >> 8) & 0x3f
  payload[8] = height & 0xff
  payload[9] = (height >> 8) & 0x3f
  const chunkHeader = Buffer.from('VP8 ', 'ascii')
  const chunkSize = Buffer.alloc(4)
  chunkSize.writeUInt32LE(payload.length, 0)
  const riffPayload = Buffer.concat([Buffer.from('WEBP', 'ascii'), chunkHeader, chunkSize, payload])
  const riff = Buffer.from('RIFF', 'ascii')
  const riffSize = Buffer.alloc(4)
  riffSize.writeUInt32LE(riffPayload.length, 0)
  return Buffer.concat([riff, riffSize, riffPayload])
}

// Build a minimal VP8X (extended) WebP. Canvas size at bytes 24..29 as 24-bit LE width-1, height-1.
function buildVp8x(width: number, height: number, padBytes: number): Buffer {
  const w = width - 1
  const h = height - 1
  const payload = Buffer.alloc(10 + padBytes)
  payload[4] = w & 0xff
  payload[5] = (w >> 8) & 0xff
  payload[6] = (w >> 16) & 0xff
  payload[7] = h & 0xff
  payload[8] = (h >> 8) & 0xff
  payload[9] = (h >> 16) & 0xff
  const chunkHeader = Buffer.from('VP8X', 'ascii')
  const chunkSize = Buffer.alloc(4)
  chunkSize.writeUInt32LE(payload.length, 0)
  const riffPayload = Buffer.concat([Buffer.from('WEBP', 'ascii'), chunkHeader, chunkSize, payload])
  const riff = Buffer.from('RIFF', 'ascii')
  const riffSize = Buffer.alloc(4)
  riffSize.writeUInt32LE(riffPayload.length, 0)
  return Buffer.concat([riff, riffSize, riffPayload])
}

describe('validateWebpUpload', () => {
  it('accepts a valid WebP at the expected size', () => {
    const buf = buildVp8l(1024, 1024, 100)
    expect(() => validateWebpUpload(buf, { maxBytes: 200_000, expectedSize: 1024 })).not.toThrow()
  })

  it('rejects non-WebP magic bytes (PNG header)', () => {
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(20, 0)])
    expect(() => validateWebpUpload(png, { maxBytes: 200_000, expectedSize: 1024 })).toThrow(
      UploadError
    )
  })

  it('rejects buffers exceeding maxBytes', () => {
    const buf = buildVp8l(1024, 1024, 200_000)
    expect(() => validateWebpUpload(buf, { maxBytes: 200_000, expectedSize: 1024 })).toThrow(
      /upload_too_large/
    )
  })

  it('rejects WebP with wrong dimensions', () => {
    const buf = buildVp8l(800, 800, 100)
    expect(() => validateWebpUpload(buf, { maxBytes: 200_000, expectedSize: 1024 })).toThrow(
      /upload_invalid_dimensions/
    )
  })

  it('accepts a valid VP8 (lossy) WebP at the expected size', () => {
    const buf = buildVp8Lossy(1024, 1024, 100)
    expect(() => validateWebpUpload(buf, { maxBytes: 200_000, expectedSize: 1024 })).not.toThrow()
  })

  it('accepts a valid VP8X (extended) WebP at the expected size', () => {
    const buf = buildVp8x(1024, 1024, 100)
    expect(() => validateWebpUpload(buf, { maxBytes: 200_000, expectedSize: 1024 })).not.toThrow()
  })

  it('rejects VP8 (lossy) with missing start code', () => {
    const buf = buildVp8Lossy(1024, 1024, 100)
    // Corrupt the start code at byte 23 (= payload[3])
    buf[23] = 0x00
    expect(() => validateWebpUpload(buf, { maxBytes: 200_000, expectedSize: 1024 })).toThrow(
      UploadError
    )
  })

  it('rejects truncated/empty buffers', () => {
    expect(() =>
      validateWebpUpload(Buffer.alloc(0), { maxBytes: 200_000, expectedSize: 1024 })
    ).toThrow(UploadError)
    expect(() =>
      validateWebpUpload(Buffer.from('RIFF'), { maxBytes: 200_000, expectedSize: 1024 })
    ).toThrow(UploadError)
  })
})
