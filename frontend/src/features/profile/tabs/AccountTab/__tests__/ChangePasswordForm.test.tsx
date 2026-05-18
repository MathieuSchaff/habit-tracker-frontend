import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useChangePassword } from '@/lib/queries/auth'
import { ChangePasswordForm } from '../ChangePasswordForm'

vi.mock('@/lib/queries/auth', () => ({
  useChangePassword: vi.fn(),
}))

function setMutation(overrides: Partial<ReturnType<typeof useChangePassword>> = {}) {
  const mutate = vi.fn()
  vi.mocked(useChangePassword).mockReturnValue({
    mutate,
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
    ...overrides,
  } as unknown as ReturnType<typeof useChangePassword>)
  return mutate
}

function renderForm() {
  const onSuccess = vi.fn()
  const onCancel = vi.fn()
  return {
    onSuccess,
    onCancel,
    ...render(<ChangePasswordForm onSuccess={onSuccess} onCancel={onCancel} />),
  }
}

describe('ChangePasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits with current+new password when both new fields match', () => {
    const mutate = setMutation()
    renderForm()

    fireEvent.change(screen.getByLabelText(/Mot de passe actuel/), {
      target: { value: 'Old1234!' },
    })
    fireEvent.change(screen.getByLabelText(/^Nouveau mot de passe/), {
      target: { value: 'New1234!' },
    })
    fireEvent.change(screen.getByLabelText(/Confirmer le nouveau/), {
      target: { value: 'New1234!' },
    })

    const submit = screen.getByRole('button', { name: 'Confirmer' })
    expect(submit).not.toBeDisabled()
    fireEvent.click(submit)

    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate.mock.calls[0][0]).toEqual({
      currentPassword: 'Old1234!',
      newPassword: 'New1234!',
    })
  })

  it('keeps submit disabled and shows mismatch error when confirmation differs', () => {
    const mutate = setMutation()
    renderForm()

    fireEvent.change(screen.getByLabelText(/Mot de passe actuel/), {
      target: { value: 'Old1234!' },
    })
    fireEvent.change(screen.getByLabelText(/^Nouveau mot de passe/), {
      target: { value: 'New1234!' },
    })
    fireEvent.change(screen.getByLabelText(/Confirmer le nouveau/), {
      target: { value: 'Different!' },
    })

    expect(screen.getByText('Les mots de passe ne correspondent pas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmer' })).toBeDisabled()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('maps the invalid_credentials error to a user-friendly message', () => {
    setMutation({
      isError: true,
      error: new Error('invalid_credentials'),
    })
    renderForm()
    expect(screen.getByText('Mot de passe actuel incorrect')).toBeInTheDocument()
  })
})
