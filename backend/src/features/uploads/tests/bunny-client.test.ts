import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'

import { putToBunny } from '../bunny-client'
import { UploadError } from '../upload-error'

describe('putToBunny', () => {
  const ORIGINAL_FETCH = globalThis.fetch
  let fetchMock: ReturnType<typeof mock>

  beforeEach(() => {
    fetchMock = mock(async () => new Response(null, { status: 201 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH
  })

  it('PUTs to Bunny URL with AccessKey header', async () => {
    await putToBunny('avatars/abc.webp', Buffer.from([1, 2, 3]))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://storage.bunnycdn.com/test-zone/avatars/abc.webp')
    expect(init.method).toBe('PUT')
    expect((init.headers as Record<string, string>).AccessKey).toBe('test-password')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('image/webp')
  })

  it('throws UploadError(upload_storage_failed) on non-2xx', async () => {
    fetchMock = mock(async () => new Response('boom', { status: 500 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch
    await expect(putToBunny('x.webp', Buffer.from([1]))).rejects.toBeInstanceOf(UploadError)
  })

  it('throws UploadError(upload_storage_failed) on network error', async () => {
    fetchMock = mock(async () => {
      throw new TypeError('fetch failed')
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch
    await expect(putToBunny('x.webp', Buffer.from([1]))).rejects.toBeInstanceOf(UploadError)
  })
})
