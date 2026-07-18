import { useSuspenseQuery } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useUpdateDermoProfile } from '@/lib/queries/profile'
import { DermoProfileForm } from '../DermoProfileForm'

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useSuspenseQuery: vi.fn() }
})

vi.mock('@/lib/queries/profile', () => ({
  profileQueries: { dermo: vi.fn(() => ({ queryKey: ['profile', 'dermo'] })) },
  useUpdateDermoProfile: vi.fn(),
}))

function setDermo(dermo: {
  skinTypes?: string[]
  fitzpatrickType?: number | null
  skinConcerns?: string[]
  privateNotes?: string | null
}) {
  vi.mocked(useSuspenseQuery).mockReturnValue({
    data: {
      skinTypes: dermo.skinTypes ?? [],
      fitzpatrickType: dermo.fitzpatrickType ?? null,
      skinConcerns: dermo.skinConcerns ?? [],
      privateNotes: dermo.privateNotes ?? null,
    },
  } as unknown as ReturnType<typeof useSuspenseQuery>)
}

function setMutation(overrides: Partial<ReturnType<typeof useUpdateDermoProfile>> = {}) {
  const mutate = vi.fn()
  vi.mocked(useUpdateDermoProfile).mockReturnValue({
    mutate,
    isPending: false,
    isError: false,
    isSuccess: false,
    ...overrides,
  } as unknown as ReturnType<typeof useUpdateDermoProfile>)
  return mutate
}

describe('DermoProfileForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setDermo({})
    setMutation()
  })

  it('keeps submit disabled until a field becomes dirty', () => {
    render(<DermoProfileForm />)
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Mixte' }))

    expect(screen.getByRole('button', { name: 'Enregistrer' })).not.toBeDisabled()
  })

  it('submits the form with current skinTypes / fitz / concerns / notes', () => {
    const mutate = setMutation()
    setDermo({ skinTypes: ['peau-mixte'], fitzpatrickType: 3 })
    render(<DermoProfileForm />)

    // Dirty up: pick a concern chip.
    fireEvent.click(screen.getByRole('button', { name: 'Acné' }))

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate.mock.calls[0][0]).toMatchObject({
      skinTypes: ['peau-mixte'],
      fitzpatrickType: 3,
      skinConcerns: ['anti-acne'],
      privateNotes: null,
    })
  })

  it('coerces empty privateNotes to null so the DB row stores SQL NULL, not ""', () => {
    const mutate = setMutation()
    render(<DermoProfileForm />)

    fireEvent.click(screen.getByRole('button', { name: 'Sensible' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(mutate.mock.calls[0][0].privateNotes).toBeNull()
  })

  it('surfaces the error banner when the update fails', () => {
    setMutation({ isError: true })
    render(<DermoProfileForm />)
    expect(screen.getByText('Une erreur est survenue lors de la sauvegarde.')).toBeInTheDocument()
  })

  it('associates section descriptions and the character hint with their controls', () => {
    render(<DermoProfileForm />)

    expect(screen.getByRole('group', { name: 'Type de peau' })).toHaveAccessibleDescription(
      "Sélectionnez jusqu'à 3 types."
    )
    expect(screen.getByRole('textbox', { name: 'Notes privées' })).toHaveAccessibleDescription(
      /Ces notes sont privées.*0\/2000/
    )
  })
})
