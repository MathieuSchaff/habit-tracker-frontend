import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SlugEditModal } from '../SlugEditModal'

function renderModal(overrides: Partial<Parameters<typeof SlugEditModal>[0]> = {}) {
  const onClose = vi.fn()
  const onConfirm = vi.fn()
  return {
    onClose,
    onConfirm,
    ...render(
      <SlugEditModal
        currentSlug="cerave-cleanser"
        productName="CeraVe Hydrating Cleanser"
        onClose={onClose}
        onConfirm={onConfirm}
        {...overrides}
      />
    ),
  }
}

describe('SlugEditModal', () => {
  it('keeps confirm disabled while the slug is unchanged', () => {
    renderModal()
    expect(screen.getByRole('button', { name: 'Confirmer le changement' })).toBeDisabled()
  })

  it('surfaces a format error when the slug contains invalid chars', () => {
    renderModal()
    fireEvent.change(screen.getByLabelText(/Nouveau slug/), {
      target: { value: 'INVALID Slug!' },
    })

    expect(
      screen.getByText('Slug invalide : minuscules, chiffres et tirets uniquement.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmer le changement' })).toBeDisabled()
  })

  it('surfaces the empty-slug error after the field is cleared', () => {
    renderModal()
    fireEvent.change(screen.getByLabelText(/Nouveau slug/), { target: { value: '' } })

    expect(screen.getByText('Le slug ne peut pas être vide.')).toBeInTheDocument()
  })

  it('emits the trimmed slug through onConfirm when valid', () => {
    const { onConfirm } = renderModal()

    fireEvent.change(screen.getByLabelText(/Nouveau slug/), {
      target: { value: '  cerave-foaming-cleanser  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le changement' }))

    expect(onConfirm).toHaveBeenCalledWith('cerave-foaming-cleanser')
  })

  it('regenerates the slug from the product name on demand', () => {
    renderModal({ productName: 'Crème Anti-âge & Régénérante' })

    fireEvent.click(screen.getByRole('button', { name: /Régénérer depuis le nom/ }))

    expect(screen.getByLabelText(/Nouveau slug/)).toHaveValue('creme-anti-age-regenerante')
  })

  it('calls onClose when cancel is clicked', () => {
    const { onClose } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
