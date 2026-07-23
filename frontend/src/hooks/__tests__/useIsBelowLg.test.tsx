import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useIsBelowLg } from '../useIsBelowLg'

const stubMatchMedia = (matches: boolean) => {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useIsBelowLg', () => {
  // A tap on the burger can land before effects flush; the very first render must
  // already report the real breakpoint or the drawer mount is silently swallowed.
  it('knows the breakpoint on the first render, before any effect runs', () => {
    stubMatchMedia(true)
    let firstRender: boolean | null = null
    const Probe = () => {
      const value = useIsBelowLg()
      if (firstRender === null) firstRender = value
      return null
    }
    render(<Probe />)
    expect(firstRender).toBe(true)
  })
})
