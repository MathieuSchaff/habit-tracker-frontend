import type { UserPublic } from '@aurore/shared'

import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/store/auth'
import { makeUserProduct } from '@/test/utils'

// Per-test query data, keyed by `queryKey.join('.')`. vi.hoisted so the mock
// factory (hoisted above imports) can read it.
const { mockQuery } = vi.hoisted(() => ({ mockQuery: { data: {} as Record<string, unknown> } }))

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQuery: (opts: { queryKey: unknown[] }) => ({
      data: mockQuery.data[opts.queryKey.join('.')],
      isLoading: false,
      isPending: false,
    }),
  }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

vi.mock('@/component/Button/Button', () => ({
  Button: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  ButtonLink: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// ShelfPulse pulls its own suspense query; out of scope for the hub copy test.
vi.mock('@/features/profile/components/ShelfPulse/ShelfPulse', () => ({
  ShelfPulse: () => <div>shelf-pulse</div>,
}))

import { HomeHub } from '../HomeHub'

const fakeUser = { id: 'u1', username: 'lea' } as unknown as UserPublic

function setQueries(data: Record<string, unknown>) {
  mockQuery.data = data
}

afterEach(() => {
  useAuthStore.setState({ user: null, role: 'user' })
  mockQuery.data = {}
})

describe('HomeHub', () => {
  it('renders a calm onboarding hub for a brand-new account', () => {
    useAuthStore.setState({ user: fakeUser, role: 'user' })
    setQueries({
      'profile.me': { createdAt: null },
      'profile.dermo': {
        skinTypes: [],
        fitzpatrickType: null,
        skinConcerns: [],
        privateNotes: null,
      },
      'user-products.list': [],
      'tasks.today': [],
      'profile.privacy': { discoverable: false },
    })

    render(<HomeHub />)

    expect(screen.getByText(/Vos produits, vos notes et les raisons/)).toBeInTheDocument()
    expect(screen.getByText(/Aucun produit pour l'instant/)).toBeInTheDocument()
    expect(screen.getByText('Compléter mon profil')).toBeInTheDocument()
    expect(screen.getByText('Activer la découverte')).toBeInTheDocument()
  })

  it('surfaces the last decision and live doorways for a returning user', () => {
    useAuthStore.setState({ user: fakeUser, role: 'user' })
    const recent = makeUserProduct({
      id: 'recent',
      status: 'in_stock',
      sentiment: 5,
      updatedAt: '2026-06-20T00:00:00.000Z',
      product: { ...makeUserProduct().product, brand: 'The Ordinary', name: 'Niacinamide 10%' },
    })
    setQueries({
      'profile.me': { createdAt: '2026-01-15T00:00:00.000Z' },
      'profile.dermo': {
        skinTypes: ['peau-mixte'],
        fitzpatrickType: 3,
        skinConcerns: ['anti-acne'],
        privateNotes: 'secret',
      },
      'user-products.list': [recent],
      'tasks.today': [{ id: 't1' }],
      'profile.privacy': { discoverable: true },
    })

    render(<HomeHub />)

    // Hero reprise line (one node) + doorway "Dernier ajout" line (another node).
    expect(screen.getByText(/vous avez classé .*En stock/)).toBeInTheDocument()
    expect(screen.getByText(/Dernier ajout : The Ordinary — Niacinamide 10%/)).toBeInTheDocument()
    // Doorway A cta flips to "Ouvrir ma collection" once a recent item exists.
    expect(screen.getByText('Ouvrir ma collection')).toBeInTheDocument()
    expect(screen.getByText('Découvrir')).toBeInTheDocument()
    expect(screen.getByText('Voir mon profil')).toBeInTheDocument()
    // Private notes are never exposed on the home.
    expect(screen.queryByText(/secret/)).not.toBeInTheDocument()
  })
})
