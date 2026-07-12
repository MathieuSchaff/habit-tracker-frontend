// Pure tests (no DB) for the reconcile dry-run classification — the preview
// that gates every corpus propagation (incl. prod) must be exercisable without
// running the script against a live database.

import { describe, expect, it } from 'bun:test'

import type { AutoTagRelevance } from '../orchestrator'
import {
  diffReconcileProduct,
  type ReconcileProductState,
} from '../runners/backfill/reconcile-diff'

const state = (over: Partial<ReconcileProductState> = {}): ReconcileProductState => ({
  want: new Map<string, AutoTagRelevance>(),
  stored: new Map<string, string>(),
  manual: new Set<string>(),
  ...over,
})

describe('diffReconcileProduct — reconcile dry-run classification', () => {
  it('classifies a wanted tag absent from DB as insert', () => {
    const diff = diffReconcileProduct(state({ want: new Map([['t1', 'secondary']]) }))
    expect(diff.inserts).toEqual(['t1'])
    expect(diff.manualShadowed).toEqual([])
  })

  it('routes a wanted tag whose PK is manual-held to manualShadowed, not insert', () => {
    const diff = diffReconcileProduct(
      state({ want: new Map([['t1', 'secondary']]), manual: new Set(['t1']) })
    )
    expect(diff.manualShadowed).toEqual(['t1'])
    expect(diff.inserts).toEqual([])
  })

  it('classifies a stored tag the orchestrator no longer emits as delete', () => {
    const diff = diffReconcileProduct(state({ stored: new Map([['t1', 'secondary']]) }))
    expect(diff.deletes).toEqual(['t1'])
  })

  it('classifies a relevance mismatch as relChange with direction, not insert/delete', () => {
    const diff = diffReconcileProduct(
      state({ want: new Map([['t1', 'avoid']]), stored: new Map([['t1', 'secondary']]) })
    )
    expect(diff.relChanges).toEqual([{ tagId: 't1', from: 'secondary', to: 'avoid' }])
    expect(diff.inserts).toEqual([])
    expect(diff.deletes).toEqual([])
  })

  it('emits an empty diff when stored already matches want', () => {
    const diff = diffReconcileProduct(
      state({ want: new Map([['t1', 'secondary']]), stored: new Map([['t1', 'secondary']]) })
    )
    expect(diff).toEqual({ inserts: [], manualShadowed: [], deletes: [], relChanges: [] })
  })
})
