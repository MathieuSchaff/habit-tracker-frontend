import { describe, expect, it } from 'vitest'

import {
  ApiError,
  extractFormError,
  type FormErrorMap,
  isApiError,
  throwIfNotOk,
} from '../apiError'

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('throwIfNotOk', () => {
  it('does nothing when the response is ok', async () => {
    await expect(throwIfNotOk(new Response(null, { status: 200 }))).resolves.toBeUndefined()
  })

  it('throws ApiError with backend code + status when body is an error envelope', async () => {
    const res = jsonResponse({ success: false, error: 'product_already_exists' }, 409)
    await expect(throwIfNotOk(res)).rejects.toMatchObject({
      name: 'ApiError',
      code: 'product_already_exists',
      status: 409,
    })
  })

  it('falls back to the provided code when the body is not a recognised envelope', async () => {
    const res = jsonResponse({ unrelated: true }, 502)
    await expect(throwIfNotOk(res, 'gateway_down')).rejects.toMatchObject({
      code: 'gateway_down',
      status: 502,
    })
  })

  it('preserves backend-provided details', async () => {
    const res = jsonResponse(
      { success: false, error: 'tag_domain_mismatch', details: { conflicting: ['vegan'] } },
      400
    )
    try {
      await throwIfNotOk(res)
      throw new Error('expected throw')
    } catch (err) {
      expect(isApiError(err)).toBe(true)
      if (isApiError(err)) {
        expect(err.details).toEqual({ conflicting: ['vegan'] })
      }
    }
  })
})

describe('extractFormError', () => {
  type Field = 'name' | 'slug'
  const map: FormErrorMap<Field> = {
    product_already_exists: { field: 'name', message: 'Nom déjà pris.' },
    unauthorized_access: { message: 'Pas le droit.' },
  }

  it('returns the mapped entry when the error code is known', () => {
    const err = new ApiError('product_already_exists', 409)
    expect(extractFormError(err, map)).toEqual({ field: 'name', message: 'Nom déjà pris.' })
  })

  it('falls back to the error message when the code is unknown', () => {
    const err = new ApiError('something_weird', 500)
    expect(extractFormError(err, map)).toEqual({ message: 'something_weird' })
  })

  it('uses fallback string when error is not an Error instance', () => {
    expect(extractFormError('plain string', map, 'fallback')).toEqual({ message: 'fallback' })
  })

  it('returns mapped entry without field when none is set', () => {
    const err = new ApiError('unauthorized_access', 403)
    expect(extractFormError(err, map)).toEqual({ message: 'Pas le droit.' })
  })
})
