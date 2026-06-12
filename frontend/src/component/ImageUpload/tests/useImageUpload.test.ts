import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useAuthStore } from '@/store/auth'
import { useImageUpload } from '../useImageUpload'

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
})
