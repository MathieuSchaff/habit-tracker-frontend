import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
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

const useQueryMock = vi.fn()
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useQuery: (opts: unknown) => useQueryMock(opts) }
})

// The reaction row is a smart child with its own queries; isolate the surface test
// from it (own suite) but spy on its props to pin the reactable wiring.
const reactionRowSpy = vi.hoisted(() => vi.fn())
vi.mock('@/features/social/components/ReactionRow/ReactionRow', () => ({
  ReactionRow: (props: { reactableType: string; reactableId: string }) => {
    reactionRowSpy(props)
    return null
  },
}))

import { ProfilePostsSection } from '../ProfilePostsSection'

describe('ProfilePostsSection', () => {
  beforeEach(() => useQueryMock.mockReset())

  it('renders a post content, its tone label and the linked product anchor', () => {
    useQueryMock.mockReturnValue({
      data: {
        posts: [
          {
            id: '1',
            content: 'Cette crème calme tout.',
            tone: 'coup-de-gueule',
            concernSlug: null,
            productAnchor: { slug: 'creme-x', name: 'Crème X' },
            ingredientAnchor: null,
            createdAt: '2026-06-25T00:00:00.000Z',
            author: { username: 'lea', profilePublic: true },
          },
        ],
      },
    })

    render(<ProfilePostsSection username="lea" />)

    expect(screen.getByText('Cette crème calme tout.')).toBeInTheDocument()
    expect(screen.getByText('Coup de gueule')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Crème X' })).toHaveAttribute(
      'href',
      '/products/creme-x'
    )
  })

  it('renders nothing when there are no posts (clean absence)', () => {
    useQueryMock.mockReturnValue({ data: { posts: [] } })
    const { container } = render(<ProfilePostsSection username="lea" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('binds each ReactionRow to its post (reactableType=post, reactableId=post.id)', () => {
    reactionRowSpy.mockClear()
    useQueryMock.mockReturnValue({
      data: {
        posts: [
          {
            id: 'p-7',
            content: 'x',
            tone: 'principal',
            concernSlug: null,
            productAnchor: null,
            ingredientAnchor: null,
            createdAt: '2026-06-25T00:00:00.000Z',
            author: { username: 'lea', profilePublic: true },
          },
        ],
      },
    })
    render(<ProfilePostsSection username="lea" />)
    expect(reactionRowSpy).toHaveBeenCalledWith({ reactableType: 'post', reactableId: 'p-7' })
  })
})
