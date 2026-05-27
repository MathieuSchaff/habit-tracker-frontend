import type { PublicProductReviewsResponse } from '@habit-tracker/shared'

import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { productKeys } from '@/lib/queries/products'
import { createTestQueryClient, renderWithProviders } from '@/test/utils'

// Stub TanStack Router Link so the component test stays router-context-free.
// Substitutes $param tokens with the provided params so href assertions hold.
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    children,
    className,
  }: {
    to: string
    params?: Record<string, string>
    children: React.ReactNode
    className?: string
  }) => {
    const href = params
      ? Object.entries(params).reduce((acc, [k, v]) => acc.replace(`$${k}`, v), to)
      : to
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
  },
}))

import { PublicReviewsSection } from '../PublicReviewsSection'

const SLUG = 'cica-cream'

function seedQuery(data: PublicProductReviewsResponse) {
  const qc = createTestQueryClient()
  qc.setQueryData(productKeys.publicReviews(SLUG), data)
  return qc
}

describe('PublicReviewsSection', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the calm empty state when no public reviews exist', () => {
    const queryClient = seedQuery({ reviews: [] })
    renderWithProviders(<PublicReviewsSection slug={SLUG} />, { queryClient })
    expect(screen.getByText('Retours utilisateurs')).toBeInTheDocument()
    expect(
      screen.getByText(/Aucun retour partagé publiquement pour ce produit/i)
    ).toBeInTheDocument()
  })

  it('renders a verbatim with raw notes when the author opted ratings public (linked author)', () => {
    const queryClient = seedQuery({
      reviews: [
        {
          id: 'rev-lea',
          tolerance: 5,
          efficacy: 3,
          sensoriality: 4,
          stability: null,
          mixability: null,
          valueForMoney: null,
          comment: 'Sensation très confortable au quotidien.',
          createdAt: '2026-04-12T12:00:00Z',
          reviewer: { username: 'lea', profilePublic: true },
        },
      ],
    })
    renderWithProviders(<PublicReviewsSection slug={SLUG} />, { queryClient })
    expect(screen.getByText('Sensation très confortable au quotidien.')).toBeInTheDocument()
    expect(screen.getByText('Tolérance')).toBeInTheDocument()
    expect(screen.getByText('5/5')).toBeInTheDocument()
    expect(screen.getByText('Effet ressenti')).toBeInTheDocument()
    expect(screen.getByText('Sensorialité')).toBeInTheDocument()
    expect(screen.getByText('3/5')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'lea' })).toHaveAttribute('href', '/u/lea')
  })

  it('renders the comment with no notes block when ratings are not public (axes null)', () => {
    const queryClient = seedQuery({
      reviews: [
        {
          id: 'rev-dis',
          tolerance: null,
          efficacy: null,
          sensoriality: null,
          stability: null,
          mixability: null,
          valueForMoney: null,
          comment: 'Trop riche pour mon usage du matin.',
          createdAt: '2026-04-10T08:00:00Z',
          reviewer: { username: 'discret-user', profilePublic: false },
        },
      ],
    })
    renderWithProviders(<PublicReviewsSection slug={SLUG} />, { queryClient })
    expect(screen.queryByRole('link', { name: 'discret-user' })).toBeNull()
    expect(screen.getByText('discret-user')).toBeInTheDocument()
    expect(screen.getByText('Trop riche pour mon usage du matin.')).toBeInTheDocument()
    expect(screen.queryByText('Tolérance')).toBeNull()
  })
})
