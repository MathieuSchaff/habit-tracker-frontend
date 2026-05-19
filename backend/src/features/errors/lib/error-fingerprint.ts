import { createHash } from 'node:crypto'

// Stable dedup key for `error_groups` (see trackError's onConflictDoUpdate).
// Two crashes with the same fingerprint share one row + a counter — without
// this, every occurrence would create a new group and drown the table.
//
// Keys on first stack frame (not the whole stack) so wrapper churn upstream
// of the crash site doesn't fragment groups. Strips `:line:col` because
// refactors shift line numbers without changing the bug — if we kept them,
// every deploy would split one bug into a new group.
export function computeFingerprint(source: string, message: string, stack?: string | null): string {
  const firstFrame = stack?.split('\n').find((l) => l.trim().startsWith('at ')) ?? ''
  const normalized = firstFrame.replace(/:\d+:\d+\)?$/, '').trim()
  return createHash('sha256').update(`${source}|${message}|${normalized}`).digest('hex')
}
