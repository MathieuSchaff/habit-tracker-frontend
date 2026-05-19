import { useSearch } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../../lib/queries/auth', () => ({
  useLogout: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))

import { BannedPage } from './BannedPage'

describe('BannedPage', () => {
  it('shows generic message when no query params', () => {
    render(<BannedPage />)

    expect(screen.getByText('Votre compte est suspendu.')).toBeInTheDocument()
    expect(screen.getByText(/contactez le support/i)).toBeInTheDocument()
  })

  it('shows formatted expiry and reason from query params', () => {
    vi.mocked(useSearch).mockReturnValueOnce({
      reason: 'Comportement abusif',
      expires: '2026-06-01T00:00:00.000Z',
    })

    render(<BannedPage />)

    expect(screen.getByText(/suspendu jusqu'au/i)).toBeInTheDocument()
    expect(screen.getByText('Comportement abusif')).toBeInTheDocument()
    expect(screen.queryByText(/contactez le support/i)).not.toBeInTheDocument()
  })

  it('shows generic message when expires is absent but reason present', () => {
    vi.mocked(useSearch).mockReturnValueOnce({ reason: 'spam', expires: undefined })

    render(<BannedPage />)

    expect(screen.getByText('Votre compte est suspendu.')).toBeInTheDocument()
    expect(screen.getByText('spam')).toBeInTheDocument()
  })
})
