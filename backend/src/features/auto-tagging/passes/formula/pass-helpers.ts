// Top-N INCI window, clamped to the list length. Names the repeated
// `slice(0, Math.min(length, n))` idiom shared across the formula passes.
export const inciWindow = (ingredients: readonly string[], n: number): readonly string[] =>
  ingredients.slice(0, Math.min(ingredients.length, n))

// Name/claim positioning gate shared by the R5 formula concern detectors:
// normalize name+description into one whitespace-collapsed haystack, require the
// positioning regex, optionally veto via an exclusion regex. Each concern's regex
// and calibration evidence stay in its own detector file.
export function matchesNamePositioning(
  name: string | null | undefined,
  description: string | null | undefined,
  positionRe: RegExp,
  exclusionRe?: RegExp
): boolean {
  const hay = `${name ?? ''} ${description ?? ''}`.replace(/\s+/g, ' ')
  return positionRe.test(hay) && !(exclusionRe?.test(hay) ?? false)
}
