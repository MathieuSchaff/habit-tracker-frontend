import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '../../../store/auth'
import { renderWithProviders } from '../../../test/utils'

const navigateMock = vi.fn()
const useSearchMock = vi.fn()

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearch: () => useSearchMock(),
  }
})

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../../../lib/queries/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/queries/auth')>()
  return {
    ...actual,
    useVerifyEmail: vi.fn(),
    useResendVerification: () => ({ mutate: vi.fn(), isPending: false }),
  }
})

import { useVerifyEmail } from '../../../lib/queries/auth'
import { VerifyEmailPage } from '../page/VerifyEmailPage/VerifyEmailPage'

function setVerifyResolves() {
  vi.mocked(useVerifyEmail).mockReturnValue({
    mutate: (_token: string, opts: { onSuccess?: () => void }) => opts.onSuccess?.(),
    isPending: false,
    isSuccess: true,
    isError: false,
    error: null,
  } as never)
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    useSearchMock.mockReturnValue({ token: 'tok123' })
    setVerifyResolves()
  })

  it('redirects to login after verifying with no session (ADR 0009)', async () => {
    useAuthStore.setState({ accessToken: null })
    renderWithProviders(<VerifyEmailPage />)

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({
        to: '/auth/login',
        search: { redirect: undefined },
      })
    })
  })

  it('sends an already-authenticated user (grace period) straight to the app', async () => {
    useAuthStore.setState({ accessToken: 'grace-token' })
    renderWithProviders(<VerifyEmailPage />)

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({ to: '/collection' })
    })
  })

  it('shows an invalid-link message and never verifies when the token is missing', () => {
    useSearchMock.mockReturnValue({})
    renderWithProviders(<VerifyEmailPage />)

    expect(screen.getByText(/Ce lien de vérification est invalide/)).toBeVisible()
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
