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

const ZERO_AXIS = { low: 0, mid: 0, high: 0 }

function seedQuery(data: PublicProductReviewsResponse) {
  const qc = createTestQueryClient()
  qc.setQueryData(productKeys.publicReviews(SLUG), data)
  return qc
}

describe('PublicReviewsSection', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders calm empty state when no public reviews exist', () => {
    const queryClient = seedQuery({
      reviews: [],
      aggregates: {
        total: 0,
        byAxis: {
          tolerance: ZERO_AXIS,
          efficacy: ZERO_AXIS,
          sensoriality: ZERO_AXIS,
          stability: ZERO_AXIS,
          mixability: ZERO_AXIS,
          valueForMoney: ZERO_AXIS,
        },
      },
    })

    renderWithProviders(<PublicReviewsSection slug={SLUG} />, { queryClient })

    expect(screen.getByText('Retours utilisateurs')).toBeInTheDocument()
    expect(
      screen.getByText(/Aucun retour partagé publiquement pour ce produit/i)
    ).toBeInTheDocument()
  })

  it('renders qualitative aggregates and verbatim with linked author when profile is public', () => {
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
      aggregates: {
        total: 1,
        byAxis: {
          tolerance: { low: 0, mid: 0, high: 1 },
          efficacy: { low: 0, mid: 1, high: 0 },
          sensoriality: { low: 0, mid: 0, high: 1 },
          stability: ZERO_AXIS,
          mixability: ZERO_AXIS,
          valueForMoney: ZERO_AXIS,
        },
      },
    })

    renderWithProviders(<PublicReviewsSection slug={SLUG} />, { queryClient })

    expect(screen.getByText('Tolérance')).toBeInTheDocument()
    expect(screen.getByText('Effet ressenti')).toBeInTheDocument()
    expect(screen.getByText('Sensorialité')).toBeInTheDocument()
    expect(screen.getByText('1 mitigé')).toBeInTheDocument()
    // tolerance and sensoriality both contribute "1 favorable" — assert both rows render.
    expect(screen.getAllByText('1 favorable')).toHaveLength(2)
    expect(screen.getByText('Sensation très confortable au quotidien.')).toBeInTheDocument()

    const link = screen.getByRole('link', { name: 'lea' })
    expect(link).toHaveAttribute('href', '/u/lea')
  })

  it('renders username as plain text when reviewer.profilePublic is false', () => {
    const queryClient = seedQuery({
      reviews: [
        {
          id: 'rev-discret',
          tolerance: 2,
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
      aggregates: {
        total: 1,
        byAxis: {
          tolerance: { low: 1, mid: 0, high: 0 },
          efficacy: ZERO_AXIS,
          sensoriality: ZERO_AXIS,
          stability: ZERO_AXIS,
          mixability: ZERO_AXIS,
          valueForMoney: ZERO_AXIS,
        },
      },
    })

    renderWithProviders(<PublicReviewsSection slug={SLUG} />, { queryClient })

    expect(screen.queryByRole('link', { name: 'discret-user' })).toBeNull()
    expect(screen.getByText('discret-user')).toBeInTheDocument()
    expect(screen.getByText('1 réservé')).toBeInTheDocument()
  })

  it('shows aggregates and a fallback line when reviews carry no written comment', () => {
    const queryClient = seedQuery({
      reviews: [
        {
          id: 'rev-silent',
          tolerance: 4,
          efficacy: 5,
          sensoriality: null,
          stability: null,
          mixability: null,
          valueForMoney: null,
          comment: null,
          createdAt: '2026-04-08T00:00:00Z',
          reviewer: { username: 'silent-rev', profilePublic: false },
        },
        {
          id: 'rev-whitespace',
          tolerance: 5,
          efficacy: null,
          sensoriality: null,
          stability: null,
          mixability: null,
          valueForMoney: null,
          comment: '   ',
          createdAt: '2026-04-09T00:00:00Z',
          reviewer: { username: 'whitespace-rev', profilePublic: false },
        },
      ],
      aggregates: {
        total: 2,
        byAxis: {
          tolerance: { low: 0, mid: 0, high: 2 },
          efficacy: { low: 0, mid: 0, high: 1 },
          sensoriality: ZERO_AXIS,
          stability: ZERO_AXIS,
          mixability: ZERO_AXIS,
          valueForMoney: ZERO_AXIS,
        },
      },
    })

    renderWithProviders(<PublicReviewsSection slug={SLUG} />, { queryClient })

    expect(screen.getByText('2 favorables')).toBeInTheDocument()
    expect(screen.getByText(/Pas encore de retour écrit/i)).toBeInTheDocument()
  })
})
