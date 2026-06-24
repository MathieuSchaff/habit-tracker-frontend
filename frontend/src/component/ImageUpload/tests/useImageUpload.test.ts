import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ensureFresh } from '@/lib/auth/freshness'
import { useAuthStore } from '@/store/auth'
import { useImageUpload } from '../useImageUpload'

// Stub only the network side of the freshness engine; keep real isExpired/scheduling.
vi.mock('@/lib/auth/freshness', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/freshness')>()
  return { ...actual, ensureFresh: vi.fn() }
})

function installCanvasMock(blobSize = 50_000) {
  const originalToBlob = HTMLCanvasElement.prototype.toBlob
  const originalGetContext = HTMLCanvasElement.prototype.getContext

  // jsdom does not implement canvas 2d — provide a no-op context stub
  ;(HTMLCanvasElement.prototype.getContext as unknown) = () => ({ drawImage: () => {} })
  ;(HTMLCanvasElement.prototype.toBlob as unknown) = (cb: BlobCallback) => {
    cb(new Blob([new Uint8Array(blobSize)], { type: 'image/webp' }))
  }
  return () => {
    HTMLCanvasElement.prototype.toBlob = originalToBlob
    HTMLCanvasElement.prototype.getContext = originalGetContext
  }
}

function installXhrMock(opts: { status: number; responseJson: object }) {
  class FakeXhr {
    upload = { onprogress: null as ((e: ProgressEvent) => void) | null }
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    status = opts.status
    responseText = JSON.stringify(opts.responseJson)
    open() {}
    setRequestHeader() {}
    send() {
      this.upload.onprogress?.(new ProgressEvent('progress', { loaded: 50, total: 100 }))
      this.onload?.()
    }
  }
  const original = globalThis.XMLHttpRequest
  // MSW patches XMLHttpRequest via defineProperty (no writable:true), so direct
  // assignment throws. Use defineProperty to bypass that restriction.
  Object.defineProperty(globalThis, 'XMLHttpRequest', {
    value: FakeXhr,
    writable: true,
    configurable: true,
  })
  return () => {
    Object.defineProperty(globalThis, 'XMLHttpRequest', {
      value: original,
      writable: true,
      configurable: true,
    })
  }
}

describe('useImageUpload', () => {
  let restoreCanvas: () => void
  let restoreXhr: (() => void) | undefined

  beforeEach(() => {
    restoreCanvas = installCanvasMock()
  })
  afterEach(() => {
    restoreCanvas()
    restoreXhr?.()
    restoreXhr = undefined
    vi.mocked(ensureFresh).mockReset()
    useAuthStore.setState({ accessToken: null })
  })

  it('moves through compressing → uploading → idle on success', async () => {
    restoreXhr = installXhrMock({
      status: 201,
      responseJson: { success: true, data: { url: 'https://cdn/x.webp?v=1' } },
    })
    const { result } = renderHook(() =>
      useImageUpload({ endpoint: '/api/uploads/avatar', outputSize: 1024 })
    )

    await act(async () => {
      ;(
        result.current as unknown as { __setSourceForTest: (b: HTMLImageElement) => void }
      ).__setSourceForTest?.(new Image())
      await result.current.confirmCrop({ x: 0, y: 0, size: 1024 })
    })
    await waitFor(() => expect(result.current.state.phase).toBe('idle'))
  })

  it('reports error when XHR returns non-2xx with mapped code', async () => {
    restoreXhr = installXhrMock({
      status: 400,
      responseJson: { success: false, error: 'upload_too_large' },
    })
    const { result } = renderHook(() =>
      useImageUpload({ endpoint: '/api/uploads/avatar', outputSize: 1024 })
    )
    await act(async () => {
      ;(
        result.current as unknown as { __setSourceForTest: (b: HTMLImageElement) => void }
      ).__setSourceForTest?.(new Image())
      try {
        await result.current.confirmCrop({ x: 0, y: 0, size: 1024 })
      } catch {
        /* expected reject */
      }
    })
    await waitFor(() => expect(result.current.state.phase).toBe('error'))
    if (result.current.state.phase === 'error') {
      expect(result.current.state.code).toBe('upload_too_large')
    }
  })

  it('dropFile rejects a non-image file', () => {
    const { result } = renderHook(() =>
      useImageUpload({ endpoint: '/api/uploads/avatar', outputSize: 1024 })
    )
    act(() => {
      result.current.dropFile(new File(['x'], 'note.txt', { type: 'text/plain' }))
    })
    expect(result.current.state.phase).toBe('error')
    if (result.current.state.phase === 'error') {
      expect(result.current.state.code).toBe('upload_invalid_format')
    }
  })

  it('dropFile accepts an image MIME and passes the guard', () => {
    const orig = URL.createObjectURL
    URL.createObjectURL = () => 'blob:mock'
    try {
      const { result } = renderHook(() =>
        useImageUpload({ endpoint: '/api/uploads/avatar', outputSize: 1024 })
      )
      act(() => {
        result.current.dropFile(new File(['x'], 'photo.jpg', { type: 'image/jpeg' }))
      })
      // Accepted MIME must not hit the rejection branch; image load is a no-op in jsdom so it stays idle.
      expect(result.current.state.phase).toBe('idle')
    } finally {
      URL.createObjectURL = orig
    }
  })

  it('cancel returns to idle', () => {
    const { result } = renderHook(() =>
      useImageUpload({ endpoint: '/api/uploads/avatar', outputSize: 1024 })
    )
    act(() => {
      result.current.cancel()
    })
    expect(result.current.state.phase).toBe('idle')
  })

  it('sets Authorization header when auth store has a token', async () => {
    useAuthStore.setState({ accessToken: 'test-tok-abc' })
    const capturedHeaders: Array<[string, string]> = []
    const original = globalThis.XMLHttpRequest

    class CapturingXhr {
      upload = { onprogress: null as ((e: ProgressEvent) => void) | null }
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      status = 201
      responseText = JSON.stringify({ success: true, data: { url: 'https://cdn/x.webp?v=1' } })
      open() {}
      setRequestHeader(name: string, value: string) {
        capturedHeaders.push([name, value])
      }
      send() {
        this.onload?.()
      }
    }
    Object.defineProperty(globalThis, 'XMLHttpRequest', {
      value: CapturingXhr,
      writable: true,
      configurable: true,
    })

    try {
      const { result } = renderHook(() =>
        useImageUpload({ endpoint: '/api/uploads/product/test-slug', outputSize: 1200 })
      )
      await act(async () => {
        ;(
          result.current as unknown as { __setSourceForTest: (b: HTMLImageElement) => void }
        ).__setSourceForTest(new Image())
        await result.current.confirmCrop({ x: 0, y: 0, size: 1200 })
      })
      await waitFor(() => expect(result.current.state.phase).toBe('idle'))
      expect(capturedHeaders).toContainEqual(['Authorization', 'Bearer test-tok-abc'])
    } finally {
      Object.defineProperty(globalThis, 'XMLHttpRequest', {
        value: original,
        writable: true,
        configurable: true,
      })
      useAuthStore.setState({ accessToken: null })
    }
  })

  it('omits Authorization header when auth store has no token', async () => {
    // accessToken is null by default — must not send Authorization at all
    const capturedHeaders: Array<[string, string]> = []
    const original = globalThis.XMLHttpRequest

    class CapturingXhr {
      upload = { onprogress: null as ((e: ProgressEvent) => void) | null }
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      status = 201
      responseText = JSON.stringify({ success: true, data: { url: 'https://cdn/x.webp?v=1' } })
      open() {}
      setRequestHeader(name: string, value: string) {
        capturedHeaders.push([name, value])
      }
      send() {
        this.onload?.()
      }
    }
    Object.defineProperty(globalThis, 'XMLHttpRequest', {
      value: CapturingXhr,
      writable: true,
      configurable: true,
    })

    try {
      const { result } = renderHook(() =>
        useImageUpload({ endpoint: '/api/uploads/avatar', outputSize: 1024 })
      )
      await act(async () => {
        ;(
          result.current as unknown as { __setSourceForTest: (b: HTMLImageElement) => void }
        ).__setSourceForTest(new Image())
        await result.current.confirmCrop({ x: 0, y: 0, size: 1024 })
      })
      await waitFor(() => expect(result.current.state.phase).toBe('idle'))
      expect(capturedHeaders.find(([name]) => name === 'Authorization')).toBeUndefined()
    } finally {
      Object.defineProperty(globalThis, 'XMLHttpRequest', {
        value: original,
        writable: true,
        configurable: true,
      })
    }
  })

  it('retries compression quality when first blob exceeds maxOutputBytes', async () => {
    // First toBlob call returns 250_000 bytes (> default 200_000),
    // second returns 150_000 (under budget).
    const originalToBlob = HTMLCanvasElement.prototype.toBlob
    let callCount = 0
    ;(HTMLCanvasElement.prototype.toBlob as unknown) = (cb: BlobCallback) => {
      callCount++
      const size = callCount === 1 ? 250_000 : 150_000
      cb(new Blob([new Uint8Array(size)], { type: 'image/webp' }))
    }
    try {
      restoreXhr = installXhrMock({
        status: 201,
        responseJson: { success: true, data: { url: 'https://cdn/x.webp?v=1' } },
      })
      const { result } = renderHook(() =>
        useImageUpload({ endpoint: '/api/uploads/avatar', outputSize: 1024 })
      )
      await act(async () => {
        ;(
          result.current as unknown as { __setSourceForTest: (b: HTMLImageElement) => void }
        ).__setSourceForTest(new Image())
        await result.current.confirmCrop({ x: 0, y: 0, size: 1024 })
      })
      await waitFor(() => expect(result.current.state.phase).toBe('idle'))
      expect(callCount).toBe(2)
    } finally {
      HTMLCanvasElement.prototype.toBlob = originalToBlob
    }
  })

  it('refreshes and retries once with the rotated token on a 401', async () => {
    useAuthStore.setState({ accessToken: 'stale-tok' })
    const sentAuth: Array<string | undefined> = []
    const original = globalThis.XMLHttpRequest

    class RetryXhr {
      upload = { onprogress: null as ((e: ProgressEvent) => void) | null }
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      status = 0
      responseText = ''
      private authHeader: string | undefined
      open() {}
      setRequestHeader(name: string, value: string) {
        if (name === 'Authorization') this.authHeader = value
      }
      send() {
        sentAuth.push(this.authHeader)
        if (sentAuth.length === 1) {
          this.status = 401
          this.responseText = JSON.stringify({ success: false, error: 'unauthorized' })
        } else {
          this.status = 201
          this.responseText = JSON.stringify({ success: true, data: { url: 'https://cdn/x?v=2' } })
        }
        this.onload?.()
      }
    }
    Object.defineProperty(globalThis, 'XMLHttpRequest', {
      value: RetryXhr,
      writable: true,
      configurable: true,
    })

    // Silent refresh succeeds and rotates the token, like a real /auth/refresh.
    vi.mocked(ensureFresh).mockImplementation(async () => {
      useAuthStore.setState({ accessToken: 'fresh-tok' })
      return 'ok'
    })

    try {
      const { result } = renderHook(() =>
        useImageUpload({ endpoint: '/api/uploads/avatar', outputSize: 1024 })
      )
      await act(async () => {
        ;(
          result.current as unknown as { __setSourceForTest: (b: HTMLImageElement) => void }
        ).__setSourceForTest(new Image())
        await result.current.confirmCrop({ x: 0, y: 0, size: 1024 })
      })
      await waitFor(() => expect(result.current.state.phase).toBe('idle'))
      expect(ensureFresh).toHaveBeenCalledOnce()
      expect(sentAuth).toEqual(['Bearer stale-tok', 'Bearer fresh-tok'])
    } finally {
      Object.defineProperty(globalThis, 'XMLHttpRequest', {
        value: original,
        writable: true,
        configurable: true,
      })
    }
  })

  it('surfaces the auth error when the silent refresh fails after a 401', async () => {
    useAuthStore.setState({ accessToken: 'stale-tok' })
    vi.mocked(ensureFresh).mockResolvedValue('failed')
    restoreXhr = installXhrMock({
      status: 401,
      responseJson: { success: false, error: 'unauthorized' },
    })
    const { result } = renderHook(() =>
      useImageUpload({ endpoint: '/api/uploads/avatar', outputSize: 1024 })
    )
    await act(async () => {
      ;(
        result.current as unknown as { __setSourceForTest: (b: HTMLImageElement) => void }
      ).__setSourceForTest(new Image())
      try {
        await result.current.confirmCrop({ x: 0, y: 0, size: 1024 })
      } catch {
        /* expected reject */
      }
    })
    await waitFor(() => expect(result.current.state.phase).toBe('error'))
    expect(ensureFresh).toHaveBeenCalledOnce()
    if (result.current.state.phase === 'error') {
      expect(result.current.state.code).toBe('unauthorized')
    }
  })
})
