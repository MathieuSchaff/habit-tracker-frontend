// Shared helper for detectors that need a normalized INCI ingredient array.
//
// `hoisted` allows the orchestrator to share a single splitINCI result across
// all passes (audit O3 D.3). When omitted, falls back to splitting locally
// for test/runner callers that don't hoist.

import { normalize, splitINCI, stripPreamble } from 'algo-derm'

// Legacy alias: algo-derm `stripPreamble` is the source of truth; Aurore used to duplicate it.
export const stripMarketingPreamble = stripPreamble

export function resolveIngredients(
  inci: string | null | undefined,
  hoisted?: readonly string[]
): readonly string[] {
  if (hoisted !== undefined) return hoisted
  if (!inci?.trim()) return []
  return splitINCI(stripPreamble(inci)).map(normalize)
}

// Korean brands and some EU products list INCI alphabetically, not by concentration.
// Position-based rules (top-8 butter/wax, top-10 AHA/BHA, etc.) are meaningless on these.
// Detection: first 8 letter-starting tokens (skips digit-prefixed like "1,2-hexanediol"),
// non-decreasing order, and ≥3 distinct first letters (avoids short sorted-by-chance INCIs).
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
