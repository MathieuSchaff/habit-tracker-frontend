import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'

import { resolveImageOutputDir } from './paths'

describe('resolveImageOutputDir', () => {
  it('defaults to backend/src/output for host-side tooling', () => {
    expect(resolveImageOutputDir({})).toBe(join(import.meta.dir, '..', '..', 'output'))
  })

  it('uses the container-provided writable directory', () => {
    expect(resolveImageOutputDir({ IMAGE_OUTPUT_DIR: '/tmp/aurore-images' })).toBe(
      '/tmp/aurore-images'
    )
  })
})
