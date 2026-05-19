import type { ProfilePublic } from '@habit-tracker/shared'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProfileForm } from '../ProfileForm'

const baseProfile: ProfilePublic = {
  userId: '019d0000-0000-7000-8000-000000000001',
  username: 'mathieu',
  bio: '',
  avatarUrl: null,
  links: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function renderForm(
  profile: ProfilePublic = baseProfile,
  overrides: { isPending?: boolean; error?: string | null } = {}
) {
  const onSubmit = vi.fn()
  const onCancel = vi.fn()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return {
    onSubmit,
    onCancel,
    ...render(
      <QueryClientProvider client={queryClient}>
        <ProfileForm
          profile={profile}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isPending={overrides.isPending ?? false}
          error={overrides.error ?? null}
        />
      </QueryClientProvider>
    ),
  }
}

function getLinkRow(index: number) {
  const list = screen.getByRole('group', { name: /Liens de profil/i })
  const items = within(list).getAllByRole('group', { name: /Lien \d+/i })
  const row = items[index]
  if (!row) throw new Error(`Row ${index} not rendered`)
  return {
    label: within(row).getByLabelText(/Label/),
    url: within(row).getByLabelText(/URL/),
  }
}

describe('ProfileForm — links validation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('silently drops a single empty row and closes the form', () => {
    const { onSubmit, onCancel } = renderForm()

    fireEvent.click(screen.getByRole('button', { name: /Ajouter un lien/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('shows inline URL error when label is filled but URL is empty', () => {
    const { onSubmit } = renderForm()

    fireEvent.click(screen.getByRole('button', { name: /Ajouter un lien/i }))
    const row0 = getLinkRow(0)
    fireEvent.change(row0.label, { target: { value: 'Instagram' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/ajoutez une adresse/i)).toBeInTheDocument()
  })

  it('shows inline label error when URL is filled but label is empty', () => {
    const { onSubmit } = renderForm()

    fireEvent.click(screen.getByRole('button', { name: /Ajouter un lien/i }))
    const row0 = getLinkRow(0)
    fireEvent.change(row0.url, { target: { value: 'https://example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/donnez un nom/i)).toBeInTheDocument()
  })

  it('shows inline URL error for an invalid URL (no protocol)', () => {
    const { onSubmit } = renderForm()

    fireEvent.click(screen.getByRole('button', { name: /Ajouter un lien/i }))
    const row0 = getLinkRow(0)
    fireEvent.change(row0.label, { target: { value: 'Instagram' } })
    fireEvent.change(row0.url, { target: { value: 'instagram.com/user' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/n'a pas l'air valide/i)).toBeInTheDocument()
  })

  it('attaches errors only to the offending row when multiple rows exist', () => {
    const { onSubmit } = renderForm()

    fireEvent.click(screen.getByRole('button', { name: /Ajouter un lien/i }))
    fireEvent.click(screen.getByRole('button', { name: /Ajouter un lien/i }))

    const row0 = getLinkRow(0)
    fireEvent.change(row0.label, { target: { value: 'Instagram' } })
    fireEvent.change(row0.url, { target: { value: 'https://instagram.com/me' } })

    const row1 = getLinkRow(1)
    fireEvent.change(row1.label, { target: { value: 'Site' } })
    // row1.url left empty → should error on row 1 only

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getAllByText(/ajoutez une adresse/i)).toHaveLength(1)
    // row 0 URL input is not in error state
    expect(getLinkRow(0).url).toHaveAttribute('aria-invalid', 'false')
    expect(getLinkRow(1).url).toHaveAttribute('aria-invalid', 'true')
  })

  it('clears errors when the user edits any field after a failed submit', () => {
    const { onSubmit } = renderForm()

    fireEvent.click(screen.getByRole('button', { name: /Ajouter un lien/i }))
    const row0 = getLinkRow(0)
    fireEvent.change(row0.label, { target: { value: 'Instagram' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(screen.getByText(/ajoutez une adresse/i)).toBeInTheDocument()

    fireEvent.change(row0.url, { target: { value: 'h' } })
    expect(screen.queryByText(/ajoutez une adresse/i)).not.toBeInTheDocument()

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits only non-empty rows, trimmed', () => {
    const { onSubmit } = renderForm()

    // Row 0: empty (drop)
    fireEvent.click(screen.getByRole('button', { name: /Ajouter un lien/i }))
    // Row 1: filled
    fireEvent.click(screen.getByRole('button', { name: /Ajouter un lien/i }))
    const row1 = getLinkRow(1)
    fireEvent.change(row1.label, { target: { value: '  Instagram  ' } })
    fireEvent.change(row1.url, { target: { value: '  https://instagram.com/me  ' } })

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toEqual({
      links: [{ label: 'Instagram', url: 'https://instagram.com/me' }],
    })
  })

  it('does not surface link errors when only username/bio changed', () => {
    const { onSubmit } = renderForm()

    fireEvent.change(screen.getByLabelText(/Nom d'utilisateur/), { target: { value: 'newuser' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toEqual({ username: 'newuser' })
  })
})
