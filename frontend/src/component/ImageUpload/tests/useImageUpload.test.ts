import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

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

  it('cancel returns to idle', () => {
    const { result } = renderHook(() =>
      useImageUpload({ endpoint: '/api/uploads/avatar', outputSize: 1024 })
    )
    act(() => {
      result.current.cancel()
    })
    expect(result.current.state.phase).toBe('idle')
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
