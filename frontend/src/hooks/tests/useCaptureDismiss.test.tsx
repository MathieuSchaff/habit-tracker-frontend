import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useCaptureDismiss } from '../useCaptureDismiss'

describe('useCaptureDismiss', () => {
  it('calls handler when clicking outside', () => {
    const handler = vi.fn()
    const ref = { current: document.createElement('div') }
    document.body.appendChild(ref.current)

    renderHook(() => useCaptureDismiss(ref, handler))

    document.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    expect(handler).toHaveBeenCalledTimes(1)

    document.body.removeChild(ref.current)
  })

  it('does not call handler when clicking inside', () => {
    const handler = vi.fn()
    const ref = { current: document.createElement('div') }
    document.body.appendChild(ref.current)

    renderHook(() => useCaptureDismiss(ref, handler))

    ref.current.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    expect(handler).not.toHaveBeenCalled()

    document.body.removeChild(ref.current)
  })

  it('attaches the listener in capture phase', () => {
    const addSpy = vi.spyOn(document, 'addEventListener')
    const handler = vi.fn()
    const ref = { current: document.createElement('div') }

    const { unmount } = renderHook(() => useCaptureDismiss(ref, handler))

    expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function), true)

    unmount()
    addSpy.mockRestore()
  })

  it('cleanups the listener on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const handler = vi.fn()
    const ref = { current: document.createElement('div') }

    const { unmount } = renderHook(() => useCaptureDismiss(ref, handler))
    unmount()

    expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function), true)

    removeSpy.mockRestore()
  })

  it('tap-block: outside click is preventDefault + stopPropagation so underlying target never activates', () => {
    const ref = { current: document.createElement('div') }
    const underlyingButton = document.createElement('button')
    const underlyingClick = vi.fn()
    underlyingButton.addEventListener('click', underlyingClick)

    document.body.appendChild(ref.current)
    document.body.appendChild(underlyingButton)

    renderHook(() => useCaptureDismiss(ref, vi.fn()))

    underlyingButton.click()

    // Capture-phase listener fired first + stopPropagation → button's own handler never ran.
    expect(underlyingClick).not.toHaveBeenCalled()

    document.body.removeChild(ref.current)
    document.body.removeChild(underlyingButton)
  })

  it('multi-ref: click inside the 2nd ref does not fire handler', () => {
    const handler = vi.fn()
    const ref1 = { current: document.createElement('div') }
    const ref2 = { current: document.createElement('div') }
    document.body.appendChild(ref1.current)
    document.body.appendChild(ref2.current)

    renderHook(() => useCaptureDismiss([ref1, ref2], handler))

    ref2.current.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    expect(handler).not.toHaveBeenCalled()

    document.body.removeChild(ref1.current)
    document.body.removeChild(ref2.current)
  })

  it('multi-ref: click outside all refs fires handler', () => {
    const handler = vi.fn()
    const ref1 = { current: document.createElement('div') }
    const ref2 = { current: document.createElement('div') }
    document.body.appendChild(ref1.current)
    document.body.appendChild(ref2.current)

    renderHook(() => useCaptureDismiss([ref1, ref2], handler))

    document.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    expect(handler).toHaveBeenCalledTimes(1)

    document.body.removeChild(ref1.current)
    document.body.removeChild(ref2.current)
  })

  it('enabled=false: no listener attached', () => {
    const handler = vi.fn()
    const ref = { current: document.createElement('div') }
    document.body.appendChild(ref.current)

    renderHook(() => useCaptureDismiss(ref, handler, { enabled: false }))

    document.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    expect(handler).not.toHaveBeenCalled()

    document.body.removeChild(ref.current)
  })

  it('enabled toggle: listener re-attaches when enabled flips back to true', () => {
    const handler = vi.fn()
    const ref = { current: document.createElement('div') }
    document.body.appendChild(ref.current)

    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useCaptureDismiss(ref, handler, { enabled }),
      { initialProps: { enabled: false } }
    )

    document.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(handler).not.toHaveBeenCalled()

    rerender({ enabled: true })
    document.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(handler).toHaveBeenCalledTimes(1)

    document.body.removeChild(ref.current)
  })
})
