import { afterEach, describe, expect, it } from 'vitest'

import { hasSessionHint } from '../sessionHint'

describe('hasSessionHint', () => {
  afterEach(() => {
    document.cookie = 'aurore_session=; max-age=0; path=/'
    document.cookie = 'not_aurore_session=; max-age=0; path=/'
  })

  it('returns false when the hint cookie is absent', () => {
    expect(hasSessionHint()).toBe(false)
  })

  it('returns true when aurore_session=1 is present', () => {
    document.cookie = 'aurore_session=1; path=/'
    expect(hasSessionHint()).toBe(true)
  })

  // Guards the exact-match parse (split/===) against a substring false positive.
  it('ignores a different cookie that merely contains the name', () => {
    document.cookie = 'not_aurore_session=1; path=/'
    expect(hasSessionHint()).toBe(false)
  })
})
