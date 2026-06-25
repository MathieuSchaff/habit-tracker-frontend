import { describe, expect, it } from 'vitest'

import { makeUserProduct } from '@/test/utils'
import { lastTouched } from '../lastTouched'

describe('lastTouched', () => {
  it('returns null for empty or missing list', () => {
    expect(lastTouched(undefined)).toBeNull()
    expect(lastTouched([])).toBeNull()
  })

  it('returns the most recently updated item', () => {
    const older = makeUserProduct({ id: 'a', updatedAt: '2026-01-01T00:00:00.000Z' })
    const newer = makeUserProduct({ id: 'b', updatedAt: '2026-06-01T00:00:00.000Z' })
    const oldest = makeUserProduct({ id: 'c', updatedAt: '2025-12-01T00:00:00.000Z' })

    expect(lastTouched([older, newer, oldest])?.id).toBe('b')
  })
})
