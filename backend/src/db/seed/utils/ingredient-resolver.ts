// Shared helper for detectors that need a normalized INCI ingredient array.
//
// `detectAllAutoTags` (auto-tag-orchestrator.ts) hoists `splitINCI(inci).map(normalize)`
// once per product so the 6 detection passes share the same array (audit
// O3 D.3 — avoid splitINCI × N when many detectors fire on the same product).
//
// Each detector accepts an optional `hoisted` array as last argument:
//   - When provided (orchestrator path), reuse it directly.
//   - When omitted (direct call from tests / runners that don't hoist),
//     fall back to splitting locally — backward compatible.

import { normalize, splitINCI, stripPreamble } from 'algo-derm'

// Re-export under the legacy local name so existing callers stay untouched.
// algo-derm `stripPreamble` is now the source of truth for the marker regex
// (parser.ts) — Aurore consumers used to ship a duplicate of the same logic.
export const stripMarketingPreamble = stripPreamble

export function resolveIngredients(
  inci: string | null | undefined,
  hoisted?: readonly string[]
): readonly string[] {
  if (hoisted !== undefined) return hoisted
  if (!inci?.trim()) return []
  return splitINCI(stripPreamble(inci)).map(normalize)
}

// Korean brands and some EU products list INCI alphabetically rather than by
// concentration. Position-based detector rules (top 8 butter/wax, top 10
// AHA/BHA, etc.) then mean nothing. Detect: take first 8 letter-starting
// tokens (skip digit-prefixed like "1,2-hexanediol"), require non-decreasing
// order AND ≥ 3 distinct first letters (rules out repeated single-letter
// fixtures and short INCIs that happen to be sorted).
const ALPHA_DETECT_WINDOW = 8
const ALPHA_DETECT_MIN_TOKENS = 5
const ALPHA_DETECT_MIN_DISTINCT_LETTERS = 3

function pickLetterTokens(ingredients: readonly string[]): string[] {
  const out: string[] = []
  for (const ing of ingredients) {
    if (out.length >= ALPHA_DETECT_WINDOW) break
    if (/^[a-z]/.test(ing)) out.push(ing)
  }
  return out
}

function isNonDecreasing(tokens: readonly string[]): boolean {
  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i] < tokens[i - 1]) return false
  }
  return true
}

export function isAlphabeticalINCI(ingredients: readonly string[]): boolean {
  const tokens = pickLetterTokens(ingredients)
  if (tokens.length < ALPHA_DETECT_MIN_TOKENS) return false
  if (!isNonDecreasing(tokens)) return false
  return new Set(tokens.map((t) => t[0])).size >= ALPHA_DETECT_MIN_DISTINCT_LETTERS
}
