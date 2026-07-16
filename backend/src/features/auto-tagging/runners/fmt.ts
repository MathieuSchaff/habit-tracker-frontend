// Column formatting for the auto-tag runner CLIs. pad and padTrunc differ only
// on over-long input: pad leaves it intact, padTrunc clips to `w` to keep wide
// tables aligned — the split is explicit so each call site states its intent.

export function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length)
}

export function padTrunc(s: string, w: number): string {
  return s.length >= w ? s.slice(0, w) : s + ' '.repeat(w - s.length)
}

export function rpad(s: string, w: number): string {
  return s.length >= w ? s : ' '.repeat(w - s.length) + s
}

// Ratio (0..1) as a percent string; the single format for every runner CLI.
export function formatPct(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`
}
