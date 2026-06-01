// Read-side trust marker. Only the positive state has a label; an unverified
// sheet renders nothing (never a « non vérifié » warning) — ADR-0006 zero-guilt.
export const CATALOG_QUALITY_LABELS = {
  verified: 'Vérifiée',
} as const

// Calm, non-punitive wording for a contributor's own submission state (#16).
// `pending` = unverified + visible: the fiche is live, awaiting a moderator's pass.
export const SUBMISSION_STATE_LABELS = {
  verified: 'Vérifiée',
  pending: 'En lecture',
  hidden: 'Masquée',
} as const
