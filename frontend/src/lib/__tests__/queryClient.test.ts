import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

vi.mock('../errorReporter', () => ({
  reportError: vi.fn().mockResolvedValue(undefined),
}))

import { toast } from 'sonner'

import { reportError } from '../errorReporter'
import { handleMutationError } from '../queryClient'

const mutationStub = (
  meta?: { errorMessage?: string; silent?: boolean },
  mutationKey?: readonly unknown[]
) => ({ meta, options: { mutationKey } })

describe('handleMutationError', () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockClear()
    vi.mocked(reportError).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reports + toasts when meta.errorMessage is set', () => {
    const err = new Error('boom')
    handleMutationError(err, mutationStub({ errorMessage: 'Échec.' }, ['user-products', 'update']))

    expect(reportError).toHaveBeenCalledTimes(1)
    expect(reportError).toHaveBeenCalledWith(err, {
      source: 'mutation',
      mutationKey: ['user-products', 'update'],
    })
    expect(toast.error).toHaveBeenCalledWith('Échec.', { id: 'Échec.' })
  })

  it('reports without toasting when meta.errorMessage is absent', () => {
    handleMutationError(new Error('silent'), mutationStub({}))
    expect(reportError).toHaveBeenCalledTimes(1)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('skips reporting when meta.silent is true (still toasts if asked)', () => {
    handleMutationError(
      new Error('expected'),
      mutationStub({ silent: true, errorMessage: 'Conflit.' })
    )
    expect(reportError).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Conflit.', { id: 'Conflit.' })
  })

  it('uses the message as the toast id so parallel failures collapse to one', () => {
    const err = new Error('boom')
    handleMutationError(err, mutationStub({ errorMessage: 'Échec.' }))
    handleMutationError(err, mutationStub({ errorMessage: 'Échec.' }))
    handleMutationError(err, mutationStub({ errorMessage: 'Échec.' }))

    expect(toast.error).toHaveBeenCalledTimes(3)
    for (const call of vi.mocked(toast.error).mock.calls) {
      expect(call[1]).toEqual({ id: 'Échec.' })
    }
  })
})
