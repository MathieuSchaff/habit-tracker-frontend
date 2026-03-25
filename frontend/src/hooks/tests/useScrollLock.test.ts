import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useScrollLock } from '../useScrollLock'

describe('useScrollLock', () => {
  const originalScrollY = window.scrollY
  const originalScrollTo = window.scrollTo

  afterEach(() => {
    // Nettoyer les styles du body après chaque test
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.left = ''
    document.body.style.right = ''
    document.body.style.overflow = ''
    delete document.body.dataset.scrollY
    window.scrollY = originalScrollY
    window.scrollTo = originalScrollTo
  })

  it('should lock scroll when locked is true', () => {
    window.scrollY = 100

    renderHook(() => useScrollLock(true))

    expect(document.body.style.position).toBe('fixed')
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.style.top).toBe('-100px')
    expect(document.body.dataset.scrollY).toBe('100')
  })

  it('should not lock scroll when locked is false', () => {
    renderHook(() => useScrollLock(false))

    expect(document.body.style.position).toBe('')
    expect(document.body.style.overflow).toBe('')
  })

  it('should unlock scroll and restore position on unmount', () => {
    window.scrollY = 250
    window.scrollTo = vi.fn()

    const { unmount } = renderHook(() => useScrollLock(true))

    expect(document.body.style.position).toBe('fixed')

    unmount()

    expect(document.body.style.position).toBe('')
    expect(document.body.style.overflow).toBe('')
    expect(window.scrollTo).toHaveBeenCalledWith(0, 250)
    expect(document.body.dataset.scrollY).toBeUndefined()
  })

  it('should unlock scroll when toggling locked from true to false', () => {
    window.scrollY = 150
    window.scrollTo = vi.fn()

    const { rerender } = renderHook(({ locked }) => useScrollLock(locked), {
      initialProps: { locked: true },
    })

    expect(document.body.style.position).toBe('fixed')

    rerender({ locked: false })

    expect(document.body.style.position).toBe('')
    expect(window.scrollTo).toHaveBeenCalledWith(0, 150)
  })
})
