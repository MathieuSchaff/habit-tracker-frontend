import type { CSSProperties } from 'react'

// Per-product identity color, cycled across the comparison. Only --tone is set;
// every tint is derived from it in CSS (theme-safe across all variants).
// Order matters: --color-accent collapses onto --color-primary in dark-foret and
// dark-ardoise, so it sits last — the first four tones stay distinct on all themes.
const PRODUCT_TONES = [
  'var(--color-primary)',
  'var(--color-aqua)',
  'var(--color-lavender)',
  'var(--color-coral-soft)',
  'var(--color-accent)',
] as const

export function productTone(index: number): CSSProperties {
  return { '--tone': PRODUCT_TONES[index % PRODUCT_TONES.length] } as CSSProperties
}
