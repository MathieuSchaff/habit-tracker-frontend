import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDebounce } from '../useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('exposes the initial value synchronously', () => {
    const { result } = renderHook(() => useDebounce('a', 200))
    expect(result.current).toBe('a')
  })

  it('only commits the last value when changes happen within the delay window', () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 200), {
      initialProps: { v: 'a' },
    })

    rerender({ v: 'b' })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    rerender({ v: 'c' })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    // 100ms since last change < 200ms debounce → not committed yet.
    expect(result.current).toBe('a')

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current).toBe('c')
  })

  it('commits synchronously when delay is 0 (after a microtask flush)', () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 0), {
      initialProps: { v: 'a' },
    })
    rerender({ v: 'b' })
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(result.current).toBe('b')
  })

  it('does not setState after unmount', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { rerender, unmount } = renderHook(({ v }) => useDebounce(v, 200), {
      initialProps: { v: 'a' },
    })
    rerender({ v: 'b' })
    unmount()

    act(() => {
      vi.advanceTimersByTime(500)
    })
    // React 19 logs "setState on unmounted component" via console.error.
    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})
