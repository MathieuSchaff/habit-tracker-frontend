import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useClickOutside } from '../useClickOutside'

describe('useClickOutside', () => {
  it('should call handler when clicking outside', () => {
    const handler = vi.fn()
    const ref = { current: document.createElement('div') }
    document.body.appendChild(ref.current)

    renderHook(() => useClickOutside(ref, handler))

    // Simuler un clic sur le body (extérieur au div)
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

    expect(handler).toHaveBeenCalledTimes(1)

    document.body.removeChild(ref.current)
  })

  it('should not call handler when clicking inside', () => {
    const handler = vi.fn()
    const ref = { current: document.createElement('div') }
    document.body.appendChild(ref.current)

    renderHook(() => useClickOutside(ref, handler))

    // Simuler un clic directement sur l'élément (intérieur)
    const event = new MouseEvent('mousedown', { bubbles: true })
    ref.current.dispatchEvent(event)

    expect(handler).not.toHaveBeenCalled()

    document.body.removeChild(ref.current)
  })

  it('should call handler when pressing Escape key', () => {
    const handler = vi.fn()
    const ref = { current: document.createElement('div') }

    renderHook(() => useClickOutside(ref, handler))

    const event = new KeyboardEvent('keydown', { key: 'Escape' })
    document.dispatchEvent(event)

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should cleanup event listeners on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const handler = vi.fn()
    const ref = { current: document.createElement('div') }

    const { unmount } = renderHook(() => useClickOutside(ref, handler))
    unmount()

    expect(removeSpy).toHaveBeenCalledWith('mousedown', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

    removeSpy.mockRestore()
  })
})
