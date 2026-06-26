import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { FeedItem } from '@/lib/queries/social'
import { renderWithProviders } from '@/test/utils'

vi.mock('@tanstack/react-router', () => ({
  // Button.tsx calls createLink at module load; stub so the import doesn't throw.
  createLink: vi.fn(() => vi.fn(({ children }) => children)),
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

const reactionRowSpy = vi.hoisted(() => vi.fn())
vi.mock('@/features/social/components/ReactionRow/ReactionRow', () => ({
  ReactionRow: (props: { reactableType: string; reactableId: string }) => {
    reactionRowSpy(props)
    return null
  },
}))

import { FeedPostCard } from '../FeedPostCard'

function feedItem(overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    id: 'post-1',
    content: 'Ma rosacée va mieux avec ce sérum.',
    tone: 'principal',
    concernSlug: 'rosacee',
    productAnchor: null,
    ingredientAnchor: null,
    createdAt: '2026-06-25T00:00:00.000Z',
    author: { username: 'lea', profilePublic: true },
    authorBand: 'tres-proche',
    ...overrides,
  }
}

describe('FeedPostCard', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders content, tone, the closeness band and a public author link', () => {
    renderWithProviders(<FeedPostCard post={feedItem()} />)

    expect(screen.getByText('Ma rosacée va mieux avec ce sérum.')).toBeInTheDocument()
    expect(screen.getByText('Principal')).toBeInTheDocument()
    expect(screen.getByText('Très proche')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'lea' })).toHaveAttribute('href', '/u/lea')
  })

  it('renders the author as plain text when their profile is not public', () => {
    renderWithProviders(
      <FeedPostCard post={feedItem({ author: { username: 'theo', profilePublic: false } })} />
    )
    expect(screen.getByText('theo')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'theo' })).not.toBeInTheDocument()
  })

  it('links product and ingredient anchors and labels the concern (no count anywhere)', () => {
    renderWithProviders(
      <FeedPostCard
        post={feedItem({
          productAnchor: { slug: 'cica-cream', name: 'Cica Cream' },
          ingredientAnchor: { slug: 'niacinamide', name: 'Niacinamide' },
        })}
      />
    )
    expect(screen.getByRole('link', { name: 'Cica Cream' })).toHaveAttribute(
      'href',
      '/products/cica-cream'
    )
    expect(screen.getByRole('link', { name: 'Niacinamide' })).toHaveAttribute(
      'href',
      '/ingredients/niacinamide'
    )
    expect(screen.getByText('Rosacée')).toBeInTheDocument()
  })

  it('binds the ReactionRow to this post (reactableType=post)', () => {
    reactionRowSpy.mockClear()
    renderWithProviders(<FeedPostCard post={feedItem({ id: 'post-42' })} />)
    expect(reactionRowSpy).toHaveBeenCalledWith({ reactableType: 'post', reactableId: 'post-42' })
  })
})
