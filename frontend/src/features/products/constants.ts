/* Card accent per product kind - decorative variety, not a legend.
   Calm palette only (green/mango/aqua/lavender). No coral/red family:
   too close to --status-color-avoided, would read as a warning. */
export const KIND_ACCENTS: Record<string, string> = {
  // skincare
  serum: 'var(--color-aqua)',
  essence: 'var(--color-aqua)',
  toner: 'var(--color-aqua)',
  mist: 'var(--color-aqua)',
  exfoliant: 'var(--color-lavender)',
  mask: 'var(--color-lavender)',
  patch: 'var(--color-lavender)',
  oil: 'var(--color-lavender)',
  moisturizer: 'var(--color-primary)',
  'eye-cream': 'var(--color-primary)',
  balm: 'var(--color-primary)',
  primer: 'var(--color-primary)',
  cleanser: 'var(--color-primary)',
  'spot-treatment': 'var(--color-accent)',
  'lip-care': 'var(--color-accent)',

  // solaire
  sunscreen: 'var(--color-accent)',
  'after-sun': 'var(--color-aqua)',
  'self-tanner': 'var(--color-accent)',

  // complement
  gelule: 'var(--color-primary)',
  capsule: 'var(--color-aqua)',
  ampoule: 'var(--color-aqua)',
  poudre: 'var(--color-lavender)',
  sirop: 'var(--color-accent)',
  gummy: 'var(--color-accent)',
  huile: 'var(--color-lavender)',

  // haircare
  shampoo: 'var(--color-aqua)',
  conditioner: 'var(--color-primary)',
  'hair-mask': 'var(--color-lavender)',
  'hair-serum': 'var(--color-aqua)',
  'hair-oil': 'var(--color-lavender)',
  styling: 'var(--color-accent)',
  'hair-color': 'var(--color-lavender)',

  // bodycare
  'body-lotion': 'var(--color-primary)',
  'body-oil': 'var(--color-lavender)',
  'body-scrub': 'var(--color-lavender)',
  'body-wash': 'var(--color-aqua)',
  deodorant: 'var(--color-aqua)',
  'hand-cream': 'var(--color-primary)',
  'foot-cream': 'var(--color-primary)',

  // dental
  toothpaste: 'var(--color-aqua)',
  mouthwash: 'var(--color-aqua)',
  'teeth-whitening': 'var(--color-primary)',
  floss: 'var(--color-primary)',
}

export const DEFAULT_KIND_ACCENT = 'var(--color-primary)'
