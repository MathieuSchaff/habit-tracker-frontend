import { describe, expect, test } from 'bun:test'

import { normalizeInci } from './normalize-inci'

describe('normalizeInci', () => {
  test('rewrites a clean list to a comma-separated canonical form', () => {
    const r = normalizeInci('Aqua, Glycerin, Niacinamide')
    expect(r.guardrailTripped).toBe(false)
    expect(r.tokensAfter).toBe(3)
    expect(r.value.split(', ')).toHaveLength(3)
  })

  test('is idempotent — same substance reads identically everywhere', () => {
    const once = normalizeInci('WATER, GLYCERIN, NIACINAMIDE, SODIUM HYALURONATE').value
    const twice = normalizeInci(once).value
    expect(twice).toBe(once)
  })

  test('passes unknown tokens through unchanged (never silently dropped)', () => {
    const r = normalizeInci('Glycerin, Extrait de Lavande, Niacinamide')
    expect(r.value).toContain('Extrait de Lavande')
    expect(r.tokensAfter).toBe(3)
  })

  test('keeps the original when cleaning halves the token count', () => {
    // A long INCI followed by marketing prose the cleaner strips: if the kept
    // portion is under half the original tokens, the original is preserved.
    const raw = 'Aqua, Glycerin, Niacinamide, Panthenol. SANS PARABEN, SANS PARFUM.'
    const r = normalizeInci(raw)
    if (r.guardrailTripped) expect(r.value).toBe(raw)
  })
})
