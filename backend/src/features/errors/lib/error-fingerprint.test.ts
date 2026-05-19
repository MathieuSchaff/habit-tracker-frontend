import { describe, expect, it } from 'bun:test'

import { computeFingerprint } from './error-fingerprint'

describe('computeFingerprint', () => {
  it('is stable across line/col shifts in the first stack frame', () => {
    const stackA = `Error: boom
    at handler (/app/routes.ts:42:11)
    at next (/app/middleware.ts:8:5)`
    const stackB = `Error: boom
    at handler (/app/routes.ts:99:3)
    at next (/app/middleware.ts:12:7)`

    expect(computeFingerprint('backend', 'boom', stackA)).toBe(
      computeFingerprint('backend', 'boom', stackB)
    )
  })

  it('differs when the first frame path changes', () => {
    const stackA = `Error: boom
    at handler (/app/routes.ts:1:1)`
    const stackB = `Error: boom
    at handler (/app/other.ts:1:1)`

    expect(computeFingerprint('backend', 'boom', stackA)).not.toBe(
      computeFingerprint('backend', 'boom', stackB)
    )
  })

  it('differs when source or message changes', () => {
    const stack = `Error: boom
    at handler (/app/routes.ts:1:1)`
    const base = computeFingerprint('backend', 'boom', stack)
    expect(computeFingerprint('frontend', 'boom', stack)).not.toBe(base)
    expect(computeFingerprint('backend', 'kaboom', stack)).not.toBe(base)
  })

  it('handles missing stack', () => {
    const a = computeFingerprint('backend', 'boom')
    const b = computeFingerprint('backend', 'boom', null)
    const c = computeFingerprint('backend', 'boom', '')
    expect(a).toBe(b)
    expect(b).toBe(c)
  })

  it('ignores frames before the first "at ..." line', () => {
    const stackA = `Error: boom
some preamble line
    at handler (/app/routes.ts:1:1)`
    const stackB = `Error: boom
    at handler (/app/routes.ts:1:1)`

    expect(computeFingerprint('backend', 'boom', stackA)).toBe(
      computeFingerprint('backend', 'boom', stackB)
    )
  })
})
