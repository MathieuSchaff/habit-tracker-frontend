// Read-side trust marker. Only the positive state has a label; an unverified
// sheet renders nothing (never a « non vérifié » warning) — ADR-0006 zero-guilt.
export const CATALOG_QUALITY_LABELS = {
  verified: 'Vérifiée',
} as const
