/** @vitest-environment jsdom */
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../../../test/utils'

const navigateMock = vi.fn()
const searchMock = vi.fn(() => ({}) as { redirect?: string })

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearch: () => searchMock(),
    Link: ({ children }: { children: React.ReactNode }) => children,
  }
})

vi.mock('../../../lib/queries/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/queries/auth')>()
  return {
    ...actual,
    useLogin: vi.fn(),
    useDemo: () => ({ mutate: vi.fn(), isPending: false }),
  }
})

import { useLogin } from '../../../lib/queries/auth'
import { LoginPage } from '../page/LoginPage/LoginPage'

const mutate = vi.fn()

const VALID_PASSWORD = 'Abcdef12!'
const VALID_EMAIL = 'user@example.com'

function setMutationResult({
  isPending = false,
  onMutate,
}: {
  isPending?: boolean
  onMutate?: (data: unknown, opts: { onSuccess?: () => void; onError?: (e: Error) => void }) => void
} = {}) {
  vi.mocked(useLogin).mockReturnValue({
    mutate: (data: unknown, opts: { onSuccess?: () => void; onError?: (e: Error) => void }) => {
      mutate(data, opts)
      onMutate?.(data, opts)
    },
    isPending,
  } as never)
}

async function fillAndSubmit(email = VALID_EMAIL, password = VALID_PASSWORD) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/^Email$/), email)
  await user.type(screen.getByLabelText(/^Mot de passe$/), password)
  await user.click(screen.getByRole('button', { name: /^Se connecter$/ }))
}

describe('LoginPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    searchMock.mockReset()
    searchMock.mockReturnValue({})
    mutate.mockReset()
    setMutationResult()
  })

  it('shows inline Zod error on invalid email format', async () => {
    renderWithProviders(<LoginPage />)
    await fillAndSubmit('not-an-email', VALID_PASSWORD)

    expect(await screen.findByText(/Format d'email invalide/i)).toBeVisible()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('shows inline error when password fails strength rules', async () => {
    renderWithProviders(<LoginPage />)
    await fillAndSubmit(VALID_EMAIL, 'short')

    // passwordSchema reports a stack of regex/length issues — first one is min length.
    expect(await screen.findByText(/Minimum 8 caractères/i)).toBeVisible()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('maps invalid_credentials → French message', async () => {
    setMutationResult({
      onMutate: (_d, opts) => opts.onError?.(new Error('invalid_credentials')),
    })

    renderWithProviders(<LoginPage />)
    await fillAndSubmit()

    expect(await screen.findByText('Email ou mot de passe incorrect')).toBeVisible()
  })

  it('redirects to /auth/verify-pending on email_not_verified instead of showing inline error', async () => {
    setMutationResult({
      onMutate: (_d, opts) => opts.onError?.(new Error('email_not_verified')),
    })

    renderWithProviders(<LoginPage />)
    await fillAndSubmit()

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({ to: '/auth/verify-pending' })
    })
    expect(screen.queryByText(/email n'est pas vérifiée/i)).not.toBeInTheDocument()
  })

  it('falls back to server_error label for unknown error codes', async () => {
    setMutationResult({
      onMutate: (_d, opts) => opts.onError?.(new Error('totally_unknown_code')),
    })

    renderWithProviders(<LoginPage />)
    await fillAndSubmit()

    expect(await screen.findByText(/Une erreur est survenue/i)).toBeVisible()
  })

  it('navigates to /collection on success when no redirect param', async () => {
    setMutationResult({
      onMutate: (_d, opts) => opts.onSuccess?.(),
    })

    renderWithProviders(<LoginPage />)
    await fillAndSubmit()

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({ to: '/collection' })
    })
  })

  it('honours ?redirect= search param on success', async () => {
    searchMock.mockReturnValue({ redirect: '/products/new' })
    setMutationResult({
      onMutate: (_d, opts) => opts.onSuccess?.(),
    })

    renderWithProviders(<LoginPage />)
    await fillAndSubmit()

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({ to: '/products/new' })
    })
  })

  it('passes parsed (email lowercased/trimmed) credentials to mutate', async () => {
    renderWithProviders(<LoginPage />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/^Email$/), '  USER@Example.COM  ')
    await user.type(screen.getByLabelText(/^Mot de passe$/), VALID_PASSWORD)
    await user.click(screen.getByRole('button', { name: /^Se connecter$/ }))

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledTimes(1)
    })
    const [payload] = mutate.mock.calls[0]
    expect(payload.email).toBe('user@example.com')
  })
})
