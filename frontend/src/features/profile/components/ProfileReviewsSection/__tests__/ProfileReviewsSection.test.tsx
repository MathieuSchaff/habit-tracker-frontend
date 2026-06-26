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

import { ProfileReviewsSection } from '../ProfileReviewsSection'

describe('ProfileReviewsSection', () => {
  beforeEach(() => useQueryMock.mockReset())

  it('renders recent reviews with the explicit product linked to its page', () => {
    useQueryMock.mockReturnValue({
      data: {
        reviews: [
          {
            id: '1',
            comment: 'Super apaisant.',
            product: { slug: 'serum-x', name: 'Sérum X' },
            reviewer: { username: 'lea' },
          },
        ],
      },
    })

    render(<ProfileReviewsSection username="lea" />)

    expect(screen.getByRole('link', { name: 'Sérum X' })).toHaveAttribute(
      'href',
      '/products/serum-x'
    )
    expect(screen.getByText('Super apaisant.')).toBeInTheDocument()
  })

  it('renders nothing when there are no reviews (clean absence)', () => {
    useQueryMock.mockReturnValue({ data: { reviews: [] } })
    const { container } = render(<ProfileReviewsSection username="lea" />)
    expect(container).toBeEmptyDOMElement()
  })
})
