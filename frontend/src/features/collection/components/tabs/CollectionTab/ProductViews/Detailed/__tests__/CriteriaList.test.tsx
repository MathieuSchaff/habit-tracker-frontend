import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CriteriaList } from '../CriteriaList'

vi.mock('@/lib/queries/user-products', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/queries/user-products')>()
  return {
    ...actual,
    useUpsertUserProductReview: vi.fn(() => ({
      mutate: vi.fn(),
    })),
  }
})

describe('CriteriaList', () => {
  afterEach(() => {
    cleanup()
  })

  const defaultProps = {
    userProductId: 'up1',
    review: {
      tolerance: 3,
      efficacy: null,
      sensoriality: null,
      stability: null,
      mixability: null,
      valueForMoney: null,
    },
  }

  it('affiche les labels des critères', () => {
    render(<CriteriaList {...defaultProps} />)
    expect(screen.getByText('Tolérance')).toBeInTheDocument()
    expect(screen.getByText('Efficacité')).toBeInTheDocument()
  })

  it('affiche 5 étoiles par critère', () => {
    render(<CriteriaList {...defaultProps} />)
    const starButtons = screen.getAllByRole('button', { name: /Noter .+ \d sur 5/i })
    expect(starButtons).toHaveLength(30)
  })

  it("ouvre l'infobulle au clic sur le bouton info", () => {
    render(<CriteriaList {...defaultProps} />)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Aide pour Tolérance'))
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })

  it("affiche le contenu de l'infobulle ouverte", () => {
    render(<CriteriaList {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('Aide pour Tolérance'))
    expect(screen.getByText(/Comment votre peau a réagi/i)).toBeInTheDocument()
  })
})
