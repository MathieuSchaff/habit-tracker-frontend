import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../../../test/utils'

const navigateMock = vi.fn()
const useSearchMock = vi.fn<() => Record<string, string>>(() => ({ token: 'reset-tok' }))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearch: () => useSearchMock(),
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  }
})

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../../../lib/queries/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/queries/auth')>()
  return {
    ...actual,
    useResetPassword: vi.fn(),
  }
})

import { useResetPassword } from '../../../lib/queries/auth'
import { RESET_ERRORS, ResetPasswordPage } from '../page/ResetPasswordPage/ResetPasswordPage'

const mutate = vi.fn()
const VALID_PASSWORD = 'Abcdef12!'

function setMutationResult({
  isPending = false,
  onMutate,
}: {
  isPending?: boolean
  onMutate?: (data: unknown, opts: { onSuccess?: () => void; onError?: (e: Error) => void }) => void
} = {}) {
  vi.mocked(useResetPassword).mockReturnValue({
    mutate: (data: unknown, opts: { onSuccess?: () => void; onError?: (e: Error) => void }) => {
      mutate(data, opts)
      onMutate?.(data, opts)
    },
    isPending,
  } as never)
}

async function fillForm({ password = VALID_PASSWORD, confirm = VALID_PASSWORD } = {}) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/^Nouveau mot de passe$/), password)
  await user.type(screen.getByLabelText(/Confirmer le mot de passe/), confirm)
  await user.click(screen.getByRole('button', { name: /Réinitialiser/ }))
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    mutate.mockReset()
    useSearchMock.mockReturnValue({ token: 'reset-tok' })
    setMutationResult()
  })

  it('shows an invalid-link screen when the token is missing', () => {
    useSearchMock.mockReturnValue({})
    renderWithProviders(<ResetPasswordPage />)

    expect(screen.getByText('Lien invalide')).toBeVisible()
  })

  it('blocks submit with mismatched passwords (Zod refine)', async () => {
    renderWithProviders(<ResetPasswordPage />)
    await fillForm({ confirm: 'Different1!' })

    expect(await screen.findByText(/Les mots de passe ne correspondent pas/)).toBeVisible()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('submits the token + password and navigates to login on success', async () => {
    setMutationResult({ onMutate: (_d, opts) => opts.onSuccess?.() })
    renderWithProviders(<ResetPasswordPage />)
    await fillForm()

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledTimes(1)
    })
    expect(mutate.mock.calls[0][0]).toEqual({ token: 'reset-tok', password: VALID_PASSWORD })
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({
        to: '/auth/login',
        search: { redirect: undefined },
        replace: true,
      })
    })
  })

  it('shows the invalid-token message when the server rejects the token', async () => {
    setMutationResult({ onMutate: (_d, opts) => opts.onError?.(new Error('invalid_token')) })
    renderWithProviders(<ResetPasswordPage />)
    await fillForm()

    expect(await screen.findByText(RESET_ERRORS.invalid_token)).toBeVisible()
  })

  it('shows the expired-token message with a link to request a new one', async () => {
    setMutationResult({ onMutate: (_d, opts) => opts.onError?.(new Error('token_expired')) })
    renderWithProviders(<ResetPasswordPage />)
    await fillForm()

    expect(await screen.findByText(RESET_ERRORS.token_expired)).toBeVisible()
    expect(screen.getByRole('link', { name: /Demander un nouveau lien/ })).toHaveAttribute(
      'href',
      '/auth/forgot-password'
    )
  })

  it('disables the submit button while the reset is in flight', () => {
    setMutationResult({ isPending: true })
    renderWithProviders(<ResetPasswordPage />)

    expect(screen.getByRole('button', { busy: true })).toBeDisabled()
  })
})
