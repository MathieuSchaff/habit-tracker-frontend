import { describe, expect, it } from 'vitest'

import { scrubUrl } from '@/lib/observability/faro'

const BASE = 'https://aurore-app.fr'

describe('scrubUrl', () => {
  it('strips a reset-password token', () => {
    expect(scrubUrl(`${BASE}/auth/reset-password?token=abc123`)).toBe(`${BASE}/auth/reset-password`)
  })

  it('strips concern (RGPD art.9 health data)', () => {
    expect(scrubUrl(`${BASE}/feed?concern=eczema`)).toBe(`${BASE}/feed`)
  })

  it('strips code and state (oauth)', () => {
    expect(scrubUrl(`${BASE}/auth/callback?code=xyz&state=nonce`)).toBe(`${BASE}/auth/callback`)
  })

  it('strips sensitive params but keeps the rest', () => {
    expect(scrubUrl(`${BASE}/feed?concern=eczema&page=2`)).toBe(`${BASE}/feed?page=2`)
  })

  it('leaves a clean url untouched', () => {
    expect(scrubUrl(`${BASE}/products?page=2`)).toBe(`${BASE}/products?page=2`)
  })

  it('does not over-match keys containing a sensitive substring', () => {
    expect(scrubUrl(`${BASE}/x?estate=1&geocode=2`)).toBe(`${BASE}/x?estate=1&geocode=2`)
  })

  it('fails safe on a relative url by dropping the whole query', () => {
    expect(scrubUrl('/feed?token=abc')).toBe('/feed')
  })
})
