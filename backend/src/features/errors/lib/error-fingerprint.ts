import { createHash } from 'node:crypto'

// Stable dedup key for `error_groups` (see trackError's onConflictDoUpdate).
// Keyed on first stack frame only: wrapper churn upstream of the crash site
// would otherwise fragment groups. Line/col stripped because refactors shift
// them without changing the bug, causing per-deploy group splits.
export function computeFingerprint(source: string, message: string, stack?: string | null): string {
  const firstFrame = stack?.split('\n').find((l) => l.trim().startsWith('at ')) ?? ''
  const normalized = firstFrame.replace(/:\d+:\d+\)?$/, '').trim()
  return createHash('sha256').update(`${source}|${message}|${normalized}`).digest('hex')
}
