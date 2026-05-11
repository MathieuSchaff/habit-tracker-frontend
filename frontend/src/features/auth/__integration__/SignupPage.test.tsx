/** @vitest-environment jsdom */
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../../../test/utils'

const navigateMock = vi.fn()

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearch: () => ({}),
    Link: ({ children }: { children: React.ReactNode }) => children,
  }
})

vi.mock('../../../lib/queries/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/queries/auth')>()
  return {
    ...actual,
    useSignup: vi.fn(),
    useDemo: () => ({ mutate: vi.fn(), isPending: false }),
  }
})

import { useSignup } from '../../../lib/queries/auth'
import { SignupPage } from '../page/SignupPage/SignupPage'

const mutate = vi.fn()
const VALID_PASSWORD = 'Abcdef12!'
const VALID_EMAIL = 'newuser@example.com'

function setMutationResult({
  isPending = false,
  onMutate,
}: {
  isPending?: boolean
  onMutate?: (data: unknown, opts: { onSuccess?: () => void; onError?: (e: Error) => void }) => void
} = {}) {
  vi.mocked(useSignup).mockReturnValue({
    mutate: (data: unknown, opts: { onSuccess?: () => void; onError?: (e: Error) => void }) => {
      mutate(data, opts)
      onMutate?.(data, opts)
    },
    isPending,
  } as never)
}

async function fillForm({
  email = VALID_EMAIL,
  password = VALID_PASSWORD,
  confirm = VALID_PASSWORD,
}: {
  email?: string
  password?: string
  confirm?: string
} = {}) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/^Email$/), email)
  await user.type(screen.getByLabelText(/^Mot de passe$/), password)
  await user.type(screen.getByLabelText(/Confirmer le mot de passe/), confirm)
  return user
}

async function submit() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /Créer mon compte/ }))
}

describe('SignupPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    mutate.mockReset()
    setMutationResult()
  })

  it('updates password live-rules as user types', async () => {
    renderWithProviders(<SignupPage />)
    const user = userEvent.setup()
    const pwInput = screen.getByLabelText(/^Mot de passe$/)

    await user.type(pwInput, 'abc')
    expect(screen.getByRole('listitem', { name: /8 caractères minimum/ })).toHaveAttribute(
      'aria-label',
      expect.stringMatching(/non validé/)
    )

    await user.clear(pwInput)
    await user.type(pwInput, VALID_PASSWORD)
    expect(screen.getByRole('listitem', { name: /8 caractères minimum/ })).toHaveAttribute(
      'aria-label',
      expect.stringMatching(/: validé/)
    )
  })

  it('blocks submit with mismatched passwords (Zod refine)', async () => {
    renderWithProviders(<SignupPage />)
    await fillForm({ confirm: 'Different1!' })
    await submit()

    expect(await screen.findByText(/Les mots de passe ne correspondent pas/)).toBeVisible()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('shows Zod inline error for invalid email', async () => {
    renderWithProviders(<SignupPage />)
    await fillForm({ email: 'bad-email' })
    await submit()

    expect(await screen.findByText(/Format d'email invalide/i)).toBeVisible()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('strips confirmPassword from the mutation payload', async () => {
    renderWithProviders(<SignupPage />)
    await fillForm()
    await submit()

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledTimes(1)
    })
    const [payload] = mutate.mock.calls[0]
    expect(payload).toEqual({ email: VALID_EMAIL, password: VALID_PASSWORD })
    expect(payload).not.toHaveProperty('confirmPassword')
  })

  it('maps email_exists → mapped FR message', async () => {
    setMutationResult({
      onMutate: (_d, opts) => opts.onError?.(new Error('email_exists')),
    })

    renderWithProviders(<SignupPage />)
    await fillForm()
    await submit()

    expect(await screen.findByText(/Un compte existe déjà avec cet email/i)).toBeVisible()
  })

  it('falls back to server_error label for unknown server codes', async () => {
    setMutationResult({
      onMutate: (_d, opts) => opts.onError?.(new Error('totally_unknown_code')),
    })

    renderWithProviders(<SignupPage />)
    await fillForm()
    await submit()

    expect(await screen.findByText(/Une erreur est survenue/i)).toBeVisible()
  })

  it('navigates to /collection on success', async () => {
    setMutationResult({
      onMutate: (_d, opts) => opts.onSuccess?.(),
    })

    renderWithProviders(<SignupPage />)
    await fillForm()
    await submit()

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({ to: '/collection' })
    })
  })

  it('shows live "passwords match" indicator only after typing in confirm field', async () => {
    renderWithProviders(<SignupPage />)
    const user = userEvent.setup()

    expect(screen.queryByLabelText(/Les mots de passe correspondent/)).not.toBeInTheDocument()

    await user.type(screen.getByLabelText(/^Mot de passe$/), VALID_PASSWORD)
    await user.type(screen.getByLabelText(/Confirmer le mot de passe/), VALID_PASSWORD)

    expect(screen.getByLabelText(/Les mots de passe correspondent/)).toHaveAttribute(
      'aria-label',
      expect.stringMatching(/: validé/)
    )
  })
})
