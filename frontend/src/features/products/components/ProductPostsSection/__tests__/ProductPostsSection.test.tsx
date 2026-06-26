import type { PublicProductPostsResponse } from '@aurore/shared'

import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { productKeys } from '@/lib/queries/products'
import { createTestQueryClient, renderWithProviders } from '@/test/utils'

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

// The reaction row is a smart child with its own queries; isolate the surface test
// from it (own suite) but spy on its props to pin the reactable wiring.
const reactionRowSpy = vi.hoisted(() => vi.fn())
vi.mock('@/features/social/components/ReactionRow/ReactionRow', () => ({
  ReactionRow: (props: { reactableType: string; reactableId: string }) => {
    reactionRowSpy(props)
    return null
  },
}))

import { ProductPostsSection } from '../ProductPostsSection'

const SLUG = 'cica-cream'

function postSurface(
  overrides: Partial<PublicProductPostsResponse['posts'][number]> = {}
): PublicProductPostsResponse['posts'][number] {
  return {
    id: 'post-1',
    content: 'Cette crème calme tout.',
    tone: 'principal',
    concernSlug: null,
    productAnchor: null,
    ingredientAnchor: null,
    createdAt: '2026-06-25T00:00:00.000Z',
    author: { username: 'lea', profilePublic: true },
    ...overrides,
  }
}

function seedQuery(data: PublicProductPostsResponse) {
  const qc = createTestQueryClient()
  qc.setQueryData(productKeys.posts(SLUG), data)
  return qc
}

describe('ProductPostsSection', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders nothing when no posts are anchored to the product (clean absence)', () => {
    const queryClient = seedQuery({ posts: [] })
    const { container } = renderWithProviders(<ProductPostsSection slug={SLUG} />, { queryClient })
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a post with its tone label and the author linked when public', () => {
    const queryClient = seedQuery({
      posts: [postSurface({ content: 'Texture top.', tone: 'coup-de-gueule' })],
    })
    renderWithProviders(<ProductPostsSection slug={SLUG} />, { queryClient })

    expect(screen.getByText('Texture top.')).toBeInTheDocument()
    expect(screen.getByText('Coup de gueule')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'lea' })).toHaveAttribute('href', '/u/lea')
  })

  it('renders the author as plain text when their profile is not public', () => {
    const queryClient = seedQuery({
      posts: [postSurface({ author: { username: 'theo', profilePublic: false } })],
    })
    renderWithProviders(<ProductPostsSection slug={SLUG} />, { queryClient })

    expect(screen.getByText('theo')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'theo' })).not.toBeInTheDocument()
  })

  it('binds each ReactionRow to its post (reactableType=post, reactableId=post.id)', () => {
    reactionRowSpy.mockClear()
    const queryClient = seedQuery({ posts: [postSurface({ id: 'post-42' })] })
    renderWithProviders(<ProductPostsSection slug={SLUG} />, { queryClient })
    expect(reactionRowSpy).toHaveBeenCalledWith({ reactableType: 'post', reactableId: 'post-42' })
  })
})
