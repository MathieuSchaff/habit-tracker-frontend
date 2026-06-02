// Only the positive state has a label; an unverified sheet renders nothing, no warning (ADR-0006).
export const CATALOG_QUALITY_LABELS = {
  verified: 'Vérifiée',
} as const

// `pending` = unverified + visible: live, awaiting a moderator pass (#16).
export const SUBMISSION_STATE_LABELS = {
  verified: 'Vérifiée',
  pending: 'En lecture',
  hidden: 'Masquée',
} as const
