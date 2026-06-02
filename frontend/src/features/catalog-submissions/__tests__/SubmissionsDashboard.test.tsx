import { useSuspenseQuery } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/utils'

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useSuspenseQuery: vi.fn() }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    Link: ({
      children,
      to,
      search,
      ...rest
    }: {
      children: React.ReactNode
      to: string
      search?: Record<string, string | undefined>
    }) => {
      const qs = search
        ? new URLSearchParams(
            Object.fromEntries(Object.entries(search).filter(([, v]) => v != null)) as Record<
              string,
              string
            >
          ).toString()
        : ''
      return (
        <a href={qs ? `${to}?${qs}` : to} {...(rest as object)}>
          {children}
        </a>
      )
    },
  }
})

import { SubmissionsDashboard } from '../page/SubmissionsDashboard'

type Submission = {
  kind: 'product' | 'ingredient'
  id: string
  name: string
  brand: string | null
  slug: string
  catalogQuality: 'unverified' | 'verified'
  moderationStatus: 'visible' | 'hidden'
  moderationReason: string | null
  createdAt: string
  updatedAt: string
}

const BASE: Submission = {
  kind: 'product',
  id: 'prod-1',
  name: 'Crème test',
  brand: 'BrandX',
  slug: 'creme-test',
  catalogQuality: 'unverified',
  moderationStatus: 'visible',
  moderationReason: null,
  createdAt: '2026-05-30T10:00:00Z',
  updatedAt: '2026-05-30T10:00:00Z',
}

function setupItems(items: Submission[]) {
  vi.mocked(useSuspenseQuery).mockReturnValue({
    data: { items },
  } as unknown as ReturnType<typeof useSuspenseQuery>)
}

describe('SubmissionsDashboard', () => {
  it('renders a verified item with its badge and no action', () => {
    setupItems([{ ...BASE, catalogQuality: 'verified' }])
    renderWithProviders(<SubmissionsDashboard />)

    expect(screen.getByText('Vérifiée')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Modifier' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Resoumettre' })).not.toBeInTheDocument()
  })

  it('renders a pending item with « En lecture » and a Modifier link to the edit route', () => {
    setupItems([BASE])
    renderWithProviders(<SubmissionsDashboard />)

    expect(screen.getByText('En lecture')).toBeInTheDocument()
    const edit = screen.getByRole('link', { name: 'Modifier' })
    expect(edit).toHaveAttribute('href', '/products/$slug/edit')
  })

  it('renders a hidden item with its reason and a kind-aware Resoumettre link', () => {
    setupItems([
      {
        ...BASE,
        kind: 'ingredient',
        id: 'ing-1',
        moderationStatus: 'hidden',
        moderationReason: 'Doublon d’une fiche existante.',
      },
    ])
    renderWithProviders(<SubmissionsDashboard />)

    expect(screen.getByText('Masquée')).toBeInTheDocument()
    expect(screen.getByText('Doublon d’une fiche existante.')).toBeInTheDocument()
    const resubmit = screen.getByRole('link', { name: 'Resoumettre' })
    const url = new URL(resubmit.getAttribute('href') ?? '', 'http://t')
    expect(url.pathname).toBe('/ingredients/new')
    expect(url.searchParams.get('name')).toBe(BASE.name)
  })

  it('Resoumettre on a hidden product prefills name + brand on /products/new', () => {
    setupItems([{ ...BASE, moderationStatus: 'hidden', moderationReason: 'Spam.' }])
    renderWithProviders(<SubmissionsDashboard />)

    const resubmit = screen.getByRole('link', { name: 'Resoumettre' })
    const url = new URL(resubmit.getAttribute('href') ?? '', 'http://t')
    expect(url.pathname).toBe('/products/new')
    expect(url.searchParams.get('name')).toBe(BASE.name)
    expect(url.searchParams.get('brand')).toBe(BASE.brand)
  })

  it('renders the empty state when there are no submissions', () => {
    setupItems([])
    renderWithProviders(<SubmissionsDashboard />)

    expect(screen.getByText('Aucune soumission')).toBeInTheDocument()
  })
})
