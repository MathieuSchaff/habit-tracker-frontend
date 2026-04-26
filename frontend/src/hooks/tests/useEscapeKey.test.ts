import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useEscapeKey } from '../useEscapeKey'

function pressKey(key: string) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

describe('useEscapeKey', () => {
  it('calls the handler when Escape is pressed', () => {
    const handler = vi.fn()
    renderHook(() => useEscapeKey(handler))

    pressKey('Escape')

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('ignores other keys', () => {
    const handler = vi.fn()
    renderHook(() => useEscapeKey(handler))

    pressKey('Enter')
    pressKey('a')
    pressKey(' ')

    expect(handler).not.toHaveBeenCalled()
  })

  it('uses the latest handler without re-attaching the listener (ref-based)', () => {
    const first = vi.fn()
    const second = vi.fn()

    const { rerender } = renderHook(({ h }) => useEscapeKey(h), {
      initialProps: { h: first },
    })

    rerender({ h: second })
    pressKey('Escape')

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('removes the listener on unmount', () => {
    const handler = vi.fn()
    const { unmount } = renderHook(() => useEscapeKey(handler))

    unmount()
    pressKey('Escape')

    expect(handler).not.toHaveBeenCalled()
  })

  it('fires every active instance when multiple are mounted', () => {
    // Current impl has no LIFO/stop semantics — both handlers fire.
    // If LIFO is added later, this test should be updated to assert ordering.
    const a = vi.fn()
    const b = vi.fn()

    const hookA = renderHook(() => useEscapeKey(a))
    const hookB = renderHook(() => useEscapeKey(b))

    pressKey('Escape')

    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)

    hookA.unmount()
    hookB.unmount()
  })
})
