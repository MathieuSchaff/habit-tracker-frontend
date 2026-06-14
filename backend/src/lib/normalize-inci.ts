import { cleanInci, splitINCI, stripPreamble } from 'algo-derm'

export type InciNormalization = {
  // Normalized list, or the original string when the guardrail tripped.
  value: string
  changed: boolean
  guardrailTripped: boolean
  tokensBefore: number
  tokensAfter: number
}

// Rewrite a raw INCI declaration to its governed canonical form: repair the
// scraped string, split, and map each token to its canonical INCI name so the
// same substance reads identically across the catalogue. Unknown tokens (FR /
// exotic) pass through unchanged — never silently dropped.
//
// canonicalizeINCI is 1:1, so the only way to lose tokens is the clean+split
// step misreading the list as prose. Guardrail: keep the original when cleaning
// halves the token count. No absolute floor — mono/bi-ingredient products
// (pure oils) are legitimate and must normalize too.
export function normalizeInci(raw: string): InciNormalization {
  const { canonical } = cleanInci(raw)
  const value = canonical.join(', ')
  const tokensBefore = splitINCI(stripPreamble(raw)).length
  const tokensAfter = canonical.length
  const guardrailTripped = tokensAfter === 0 || tokensAfter * 2 < tokensBefore
  return {
    value: guardrailTripped ? raw : value,
    changed: !guardrailTripped && value !== raw,
    guardrailTripped,
    tokensBefore,
    tokensAfter,
  }
}
