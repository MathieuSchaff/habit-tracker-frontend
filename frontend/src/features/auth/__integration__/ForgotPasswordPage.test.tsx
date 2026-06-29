import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../../../test/utils'

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useSearch: () => ({}),
    Link: ({ children }: { children: React.ReactNode }) => children,
  }
})

vi.mock('../../../lib/queries/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/queries/auth')>()
  return {
    ...actual,
    useForgotPassword: vi.fn(),
  }
})

import { useForgotPassword } from '../../../lib/queries/auth'
import { ForgotPasswordPage } from '../page/ForgotPasswordPage/ForgotPasswordPage'

const mutate = vi.fn()

function setMutationResult({
  isPending = false,
  onMutate,
}: {
  isPending?: boolean
  onMutate?: (data: unknown, opts: { onSuccess?: () => void; onError?: (e: Error) => void }) => void
} = {}) {
  vi.mocked(useForgotPassword).mockReturnValue({
    mutate: (data: unknown, opts: { onSuccess?: () => void; onError?: (e: Error) => void }) => {
      mutate(data, opts)
      onMutate?.(data, opts)
    },
    isPending,
  } as never)
}

async function fillAndSubmit(email = 'user@example.com') {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/^Email$/), email)
  await user.click(screen.getByRole('button', { name: /Envoyer le lien/ }))
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    mutate.mockReset()
    setMutationResult()
  })

  it('shows a Zod inline error for an invalid email and does not submit', async () => {
    renderWithProviders(<ForgotPasswordPage />)
    await fillAndSubmit('bad-email')

    expect(await screen.findByText(/Format d'email invalide/i)).toBeVisible()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('shows the same neutral confirmation on success (no existence leak)', async () => {
    setMutationResult({ onMutate: (_d, opts) => opts.onSuccess?.() })
    renderWithProviders(<ForgotPasswordPage />)
    await fillAndSubmit()

    expect(await screen.findByText(/Si un compte existe avec cette adresse/)).toBeVisible()
  })

  it('surfaces a generic error message on failure', async () => {
    setMutationResult({ onMutate: (_d, opts) => opts.onError?.(new Error('server_error')) })
    renderWithProviders(<ForgotPasswordPage />)
    await fillAndSubmit()

    expect(await screen.findByText(/Une erreur est survenue/)).toBeVisible()
  })

  it('disables the submit button while the request is in flight', () => {
    setMutationResult({ isPending: true })
    renderWithProviders(<ForgotPasswordPage />)

    expect(screen.getByRole('button', { busy: true })).toBeDisabled()
  })
})
