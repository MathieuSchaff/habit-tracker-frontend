// Pure per-product diff for the reconcile dry-run (no DB / no env imports, so
// it unit-tests without a database — mirror of classify.ts for the backfill).
// Decides which stored auto rows the current orchestrator would insert, delete
// or re-level, and which wanted tags a manual row shadows; reconcile.ts feeds
// it the loaded maps and only counts/prints. The WRITE path never uses this:
// it applies writeTagsForProduct directly.

import type { AutoTagRelevance } from '../../orchestrator'

export interface ReconcileProductState {
  // tagId → relevance the orchestrator wants persisted (kernel `rows`).
  want: ReadonlyMap<string, AutoTagRelevance>
  // tagId → relevance currently stored with source != 'manual'.
  stored: ReadonlyMap<string, string>
  // tagIds whose PK is held by a source = 'manual' row.
  manual: ReadonlySet<string>
}

export interface ReconcileProductDiff {
  inserts: string[]
  manualShadowed: string[]
  deletes: string[]
  relChanges: { tagId: string; from: string; to: AutoTagRelevance }[]
}

export function diffReconcileProduct(state: ReconcileProductState): ReconcileProductDiff {
  const inserts: string[] = []
  const manualShadowed: string[] = []
  const deletes: string[] = []
  const relChanges: { tagId: string; from: string; to: AutoTagRelevance }[] = []

  for (const [tagId, wantedRel] of state.want) {
    const storedRel = state.stored.get(tagId)
    if (storedRel === undefined) {
      // A manual row on the PK makes the insert a no-op (onConflictDoNothing
      // yields to the human tag) — tracked apart to avoid phantom inserts.
      if (state.manual.has(tagId)) manualShadowed.push(tagId)
      else inserts.push(tagId)
    } else if (storedRel !== wantedRel) {
      relChanges.push({ tagId, from: storedRel, to: wantedRel })
    }
  }
  for (const tagId of state.stored.keys()) {
    if (!state.want.has(tagId)) deletes.push(tagId)
  }
  return { inserts, manualShadowed, deletes, relChanges }
}
