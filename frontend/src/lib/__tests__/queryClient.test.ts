import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-hot-toast', () => ({
  toast: { error: vi.fn() },
}))

vi.mock('../observability/faro', () => ({
  captureFrontendError: vi.fn(),
}))

import { toast } from 'react-hot-toast'

import { captureFrontendError } from '../observability/faro'
import { handleMutationError } from '../queryClient'

const mutationStub = (
  meta?: { errorMessage?: string; silent?: boolean },
  mutationKey?: readonly unknown[]
) => ({ meta, options: { mutationKey } })

describe('handleMutationError', () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockClear()
    vi.mocked(captureFrontendError).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reports + toasts when meta.errorMessage is set', () => {
    const err = new Error('boom')
    handleMutationError(err, mutationStub({ errorMessage: 'Échec.' }, ['user-products', 'update']))

    expect(captureFrontendError).toHaveBeenCalledTimes(1)
    expect(captureFrontendError).toHaveBeenCalledWith(err, {
      source: 'mutation',
      mutationKey: ['user-products', 'update'],
    })
    expect(toast.error).toHaveBeenCalledWith('Échec.', { id: 'Échec.' })
  })

  it('reports without toasting when meta.errorMessage is absent', () => {
    handleMutationError(new Error('silent'), mutationStub({}))
    expect(captureFrontendError).toHaveBeenCalledTimes(1)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('skips reporting when meta.silent is true (still toasts if asked)', () => {
    handleMutationError(
      new Error('expected'),
      mutationStub({ silent: true, errorMessage: 'Conflit.' })
    )
    expect(captureFrontendError).not.toHaveBeenCalled()
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
