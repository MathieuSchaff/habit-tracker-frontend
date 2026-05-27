import { cleanup, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { pdsLabels } from '@/features/collection/constants'
import { makeUserProduct, renderWithProviders } from '@/test/utils'
import { ProductDetailSheet } from '../ProductDetailSheet'

const updateMutate = vi.fn()

vi.mock('@/lib/queries/user-products', async () => {
  const actual = (await vi.importActual('@/lib/queries/user-products')) as any
  return {
    ...actual,
    useUpdateUserProduct: vi.fn(() => ({ mutate: updateMutate })),
    useDeleteUserProduct: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useUpsertUserProductReview: vi.fn(() => ({ mutate: vi.fn() })),
  }
})

vi.mock('@/lib/queries/purchases', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/queries/purchases')>()
  return {
    ...actual,
    useOpenPurchase: vi.fn(() => ({ mutate: vi.fn() })),
    useFinishPurchase: vi.fn(() => ({ mutate: vi.fn() })),
    useAddPurchase: vi.fn(() => ({ mutate: vi.fn() })),
  }
})

vi.mock('@/hooks/useScrollLock', () => ({
  useScrollLock: vi.fn(),
}))

describe('ProductDetailSheet', () => {
  afterEach(() => {
    cleanup()
    updateMutate.mockClear()
  })

  const defaultProps = {
    p: makeUserProduct(),
    onClose: vi.fn(),
  }

  it('affiche le nom et la marque dans le header', () => {
    renderWithProviders(<ProductDetailSheet {...defaultProps} />)
    expect(screen.getByText('CeraVe Hydrating Cleanser')).toBeInTheDocument()
    expect(screen.getByText('CeraVe')).toBeInTheDocument()
  })

  it('affiche les sections de détail', () => {
    renderWithProviders(<ProductDetailSheet {...defaultProps} />)
    // Accordion headers are <button>; the sentiment-quick label also renders as a <h4>.
    expect(
      screen.getByRole('button', { name: new RegExp(pdsLabels.experience, 'i') })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: pdsLabels.sentimentQuick, level: 4 })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: new RegExp(pdsLabels.lifecycle, 'i') })
    ).toBeInTheDocument()
  })

  it('appelle onClose au clic sur le bouton X', async () => {
    const onClose = vi.fn()
    renderWithProviders(<ProductDetailSheet {...defaultProps} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /Fermer/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('appelle onClose au clic sur le backdrop', async () => {
    const onClose = vi.fn()
    renderWithProviders(<ProductDetailSheet {...defaultProps} onClose={onClose} />)
    // Backdrop = click on the <dialog> itself, not a child.
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalled()
  })

  it('appelle onClose sur la touche Escape', async () => {
    const onClose = vi.fn()
    renderWithProviders(<ProductDetailSheet {...defaultProps} onClose={onClose} />)
    // jsdom doesn't convert keydown Escape to a cancel event.
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false, cancelable: true }))
    expect(onClose).toHaveBeenCalled()
  })

  it("toggle d'un chip Ressenti déclenche updateUserProduct avec le tableau mergé", async () => {
    const props = {
      ...defaultProps,
      p: makeUserProduct({ ressenti: ['leger'], routine: [], preferences: [] }),
    }
    renderWithProviders(<ProductDetailSheet {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Confortable' }))
    expect(updateMutate).toHaveBeenCalledWith({
      id: 'test-id-1',
      input: { ressenti: ['leger', 'confortable'] },
    })
  })

  it('décocher un chip Routine déjà sélectionné le retire du tableau', async () => {
    const props = {
      ...defaultProps,
      p: makeUserProduct({ ressenti: [], routine: ['matin', 'voyage'], preferences: [] }),
    }
    renderWithProviders(<ProductDetailSheet {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Matin' }))
    expect(updateMutate).toHaveBeenCalledWith({
      id: 'test-id-1',
      input: { routine: ['voyage'] },
    })
  })
})
