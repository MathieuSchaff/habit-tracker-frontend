// Only the positive state has a label; unverified sheets render nothing, no warning.
export const CATALOG_QUALITY_LABELS = {
  verified: 'Vérifiée',
} as const

// Pending submissions stay visible while waiting for moderator review.
export const SUBMISSION_STATE_LABELS = {
  verified: 'Vérifiée',
  pending: 'En lecture',
  hidden: 'Masquée',
} as const
