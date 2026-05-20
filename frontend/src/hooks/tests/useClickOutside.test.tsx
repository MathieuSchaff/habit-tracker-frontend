import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useClickOutside } from '../useClickOutside'

describe('useClickOutside', () => {
  it('should call handler when clicking outside', () => {
    const handler = vi.fn()
    const ref = { current: document.createElement('div') }
    document.body.appendChild(ref.current)

    renderHook(() => useClickOutside(ref, handler))

    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

    expect(handler).toHaveBeenCalledTimes(1)

    document.body.removeChild(ref.current)
  })

  it('should not call handler when clicking inside', () => {
    const handler = vi.fn()
    const ref = { current: document.createElement('div') }
    document.body.appendChild(ref.current)

    renderHook(() => useClickOutside(ref, handler))

    const event = new MouseEvent('mousedown', { bubbles: true })
    ref.current.dispatchEvent(event)

    expect(handler).not.toHaveBeenCalled()

    document.body.removeChild(ref.current)
  })

  it('should cleanup event listeners on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const handler = vi.fn()
    const ref = { current: document.createElement('div') }

    const { unmount } = renderHook(() => useClickOutside(ref, handler))
    unmount()

    expect(removeSpy).toHaveBeenCalledWith('mousedown', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function))

    removeSpy.mockRestore()
  })

  it('should attach touchstart listener as passive', () => {
    const addSpy = vi.spyOn(document, 'addEventListener')
    const handler = vi.fn()
    const ref = { current: document.createElement('div') }

    const { unmount } = renderHook(() => useClickOutside(ref, handler))

    expect(addSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: true })

    unmount()
    addSpy.mockRestore()
  })

  it('multi-ref — click inside the 2nd ref does not fire handler', () => {
    const handler = vi.fn()
    const ref1 = { current: document.createElement('div') }
    const ref2 = { current: document.createElement('div') }
    document.body.appendChild(ref1.current)
    document.body.appendChild(ref2.current)

    renderHook(() => useClickOutside([ref1, ref2], handler))

    const event = new MouseEvent('mousedown', { bubbles: true })
    ref2.current.dispatchEvent(event)

    expect(handler).not.toHaveBeenCalled()

    document.body.removeChild(ref1.current)
    document.body.removeChild(ref2.current)
  })

  it('multi-ref — click outside all refs fires handler', () => {
    const handler = vi.fn()
    const ref1 = { current: document.createElement('div') }
    const ref2 = { current: document.createElement('div') }
    document.body.appendChild(ref1.current)
    document.body.appendChild(ref2.current)

    renderHook(() => useClickOutside([ref1, ref2], handler))

    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

    expect(handler).toHaveBeenCalledTimes(1)

    document.body.removeChild(ref1.current)
    document.body.removeChild(ref2.current)
  })

  it('enabled: false — no listener attached', () => {
    const handler = vi.fn()
    const ref = { current: document.createElement('div') }
    document.body.appendChild(ref.current)

    renderHook(() => useClickOutside(ref, handler, { enabled: false }))

    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

    expect(handler).not.toHaveBeenCalled()

    document.body.removeChild(ref.current)
  })

  it('enabled toggle — listener re-attaches when enabled flips back to true', () => {
    const handler = vi.fn()
    const ref = { current: document.createElement('div') }
    document.body.appendChild(ref.current)

    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useClickOutside(ref, handler, { enabled }),
      { initialProps: { enabled: false } }
    )

    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(handler).not.toHaveBeenCalled()

    rerender({ enabled: true })
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(handler).toHaveBeenCalledTimes(1)

    document.body.removeChild(ref.current)
  })
})
