import type { UserDermoProfile } from '@habit-tracker/shared'

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SkinProfileRead } from '../SkinProfileRead'

function makeDermo(overrides: Partial<UserDermoProfile> = {}): UserDermoProfile {
  return {
    skinTypes: [],
    skinConcerns: [],
    fitzpatrickType: null,
    privateNotes: null,
    ...overrides,
  } as unknown as UserDermoProfile
}

describe('SkinProfileRead', () => {
  it('shows the empty message when no profile field is set', () => {
    render(<SkinProfileRead dermo={makeDermo()} />)
    expect(screen.getByText('Aucun profil peau renseigné.')).toBeInTheDocument()
  })

  it('renders mapped FR labels for skin types and concerns', () => {
    render(
      <SkinProfileRead
        dermo={makeDermo({
          skinTypes: ['peau-mixte', 'peau-sensible'],
          skinConcerns: ['rosacee', 'anti-acne'],
        })}
      />
    )

    expect(screen.getByText('Mixte')).toBeInTheDocument()
    expect(screen.getByText('Sensible')).toBeInTheDocument()
    expect(screen.getByText('Rosacée')).toBeInTheDocument()
    expect(screen.getByText('Acné')).toBeInTheDocument()
  })

  it('renders the fitzpatrick badge with its long-form description', () => {
    render(<SkinProfileRead dermo={makeDermo({ fitzpatrickType: 3 })} />)
    expect(screen.getByText(/III — Brûle modérément, bronze/)).toBeInTheDocument()
  })

  it('hides the notes toggle when the note is short (≤150 chars)', () => {
    render(<SkinProfileRead dermo={makeDermo({ privateNotes: 'Short note.' })} />)

    expect(screen.getByText('Short note.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Voir plus/ })).not.toBeInTheDocument()
  })

  it('toggles between collapsed and expanded states on long notes', () => {
    const longNote = 'a'.repeat(200)
    render(<SkinProfileRead dermo={makeDermo({ privateNotes: longNote })} />)

    const toggle = screen.getByRole('button', { name: /Voir plus/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: /Voir moins/ })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
  })
})
