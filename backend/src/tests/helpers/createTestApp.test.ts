import { describe, expect, it } from 'bun:test'

import { setupDbTests } from '../db-setup'
import { createTestApp } from './createTestApp'

setupDbTests()

// Regression guard for bug C4: the harness must mount routes like production
// (index.ts) or a prefix/routing regression passes CI green. Two invariants:
// every route lives under /api, and product routes come from the productsFeature
// composite (which alone carries dermoScoreRoutes), not the sub-routers individually.
describe('createTestApp prod-mount parity (bug C4)', () => {
  it('mounts every route under the /api prefix', async () => {
    const app = await createTestApp()
    const paths = [...new Set(app.routes.map((r) => r.path))].filter((p) => p !== '*' && p !== '/*')
    expect(paths.filter((p) => !p.startsWith('/api'))).toEqual([])
  })

  it('mounts the products feature as a composite (carries dermo-score)', async () => {
    const app = await createTestApp()
    const dermo = app.routes.map((r) => r.path).find((p) => p.includes('dermo-score'))
    expect(dermo).toBeDefined()
    expect(dermo?.startsWith('/api/products')).toBe(true)
  })
})
