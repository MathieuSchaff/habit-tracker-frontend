import { describe, expect, it } from 'vitest'

import { isHttpError } from '../isHttpError'

describe('isHttpError', () => {
  it('should return true for an Error with the matching status', () => {
    const error = new Error('Conflict')
    ;(error as any).status = 409
    expect(isHttpError(error, 409)).toBe(true)
  })

  it('should return false for an Error with a different status', () => {
    const error = new Error('Not Found')
    ;(error as any).status = 404
    expect(isHttpError(error, 409)).toBe(false)
  })

  it('should return false for a generic Error without status', () => {
    const error = new Error('Generic error')
    expect(isHttpError(error, 409)).toBe(false)
  })

  it('should return false for non-error types', () => {
    expect(isHttpError({ status: 409 }, 409)).toBe(false)
    expect(isHttpError(null, 409)).toBe(false)
    expect(isHttpError(undefined, 409)).toBe(false)
    expect(isHttpError('409', 409)).toBe(false)
  })
})
