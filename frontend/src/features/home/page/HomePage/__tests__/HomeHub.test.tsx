import type { UserPublic } from '@aurore/shared'

import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/store/auth'
import { makeUserProduct } from '@/test/utils'

// Per-test query data, keyed by `queryKey.join('.')`. vi.hoisted so the mock
// factory (hoisted above imports) can read it.
const { mockQuery } = vi.hoisted(() => ({
  mockQuery: { data: {} as Record<string, unknown>, errors: {} as Record<string, boolean> },
}))

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQuery: (opts: { queryKey: unknown[] }) => {
      const key = opts.queryKey.join('.')
      const isError = mockQuery.errors[key] ?? false
      return {
        data: isError ? undefined : mockQuery.data[key],
        isLoading: false,
        isPending: false,
        isError,
        refetch: vi.fn(),
      }
    },
  }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    // Expose `to`/`search.tab`/`hash` so doorway deep-links are assertable.
    Link: ({
      children,
      to,
      search,
      hash,
    }: {
      children: React.ReactNode
      to?: string
      search?: { tab?: string }
      hash?: string
    }) => (
      <a href={typeof to === 'string' ? to : undefined} data-tab={search?.tab} data-hash={hash}>
        {children}
      </a>
    ),
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
  mockQuery.errors = {}
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
    // Discovery off → land on the account tab that holds the toggle, not a dead-end.
    const discoverCta = screen.getByText('Activer la découverte').closest('a')
    expect(discoverCta).toHaveAttribute('href', '/profile')
    expect(discoverCta).toHaveAttribute('data-tab', 'account')
    // …and deep-links to the toggle so it isn't lost mid-page.
    expect(discoverCta).toHaveAttribute('data-hash', 'discoverable')
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
    // Discovery on → the doorway opens the people tab directly.
    const discoverCta = screen.getByText('Découvrir').closest('a')
    expect(discoverCta).toHaveAttribute('href', '/profile')
    expect(discoverCta).toHaveAttribute('data-tab', 'people')
    // On → no scroll hash needed (the people tab is the content itself).
    expect(discoverCta).not.toHaveAttribute('data-hash')
    expect(screen.getByText('Voir mon profil')).toBeInTheDocument()
    // Private notes are never exposed on the home.
    expect(screen.queryByText(/secret/)).not.toBeInTheDocument()
  })

  it('surfaces a calm retry instead of an endless spinner when the skin query errors', () => {
    useAuthStore.setState({ user: fakeUser, role: 'user' })
    setQueries({
      'profile.me': { createdAt: null },
      'user-products.list': [],
      'tasks.today': [],
      'profile.privacy': { discoverable: false },
    })
    mockQuery.errors = { 'profile.dermo': true }

    render(<HomeHub />)

    expect(screen.getByText(/Votre portrait n'a pas pu se charger/)).toBeInTheDocument()
    expect(screen.getByText('Réessayer')).toBeInTheDocument()
    expect(screen.queryByText('Chargement de votre portrait…')).not.toBeInTheDocument()
  })
})
