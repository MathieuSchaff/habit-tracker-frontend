import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../../../../test/utils'

const navigateMock = vi.fn()

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return { ...actual, useNavigate: () => navigateMock }
})

type MutateOpts = { onSuccess?: () => void; onError?: (e: Error) => void }
const demoMutate = vi.fn()
let demoIsPending = false

vi.mock('../../../../lib/queries/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/queries/auth')>()
  return {
    ...actual,
    useDemo: () => ({ mutate: demoMutate, isPending: demoIsPending }),
  }
})

import { DemoButton } from './DemoButton'

describe('DemoButton', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    demoMutate.mockReset()
    demoIsPending = false
  })

  it('navigates to /collection on success', async () => {
    demoMutate.mockImplementation((_input: undefined, opts: MutateOpts) => opts.onSuccess?.())
    renderWithProviders(<DemoButton />)

    await userEvent.setup().click(screen.getByRole('button', { name: /Essayer la démo/ }))

    expect(demoMutate).toHaveBeenCalledOnce()
    expect(navigateMock).toHaveBeenCalledWith({ to: '/collection' })
  })

  it('does not navigate when the mutation fails', async () => {
    demoMutate.mockImplementation((_input: undefined, opts: MutateOpts) =>
      opts.onError?.(new Error('server_error'))
    )
    renderWithProviders(<DemoButton />)

    await userEvent.setup().click(screen.getByRole('button', { name: /Essayer la démo/ }))

    expect(demoMutate).toHaveBeenCalledOnce()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('disables the button while pending', () => {
    demoIsPending = true
    renderWithProviders(<DemoButton />)

    // The Button swaps its label for a loading spinner, so query the sole button.
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
