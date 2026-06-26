import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// Button.tsx calls createLink at module load; stub it plus a plain Link that
// resolves /u/$username params to an href (canonical project pattern).
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

import { SimilarPeopleList } from '../SimilarPeopleList'

describe('SimilarPeopleList', () => {
  it('renders one row per profile with a band label and a link to the profile', () => {
    render(
      <SimilarPeopleList
        profiles={[
          { username: 'lea', band: 'tres-proche' },
          { username: 'anna', band: 'proche' },
        ]}
      />
    )

    const lea = screen.getByRole('link', { name: 'lea' })
    expect(lea).toHaveAttribute('href', '/u/lea')
    expect(screen.getByRole('link', { name: 'anna' })).toHaveAttribute('href', '/u/anna')

    // FR ordinal labels from the shared constant, never the raw slug.
    expect(screen.getByText('Très proche')).toBeInTheDocument()
    expect(screen.getByText('Proche')).toBeInTheDocument()
    expect(screen.queryByText('tres-proche')).not.toBeInTheDocument()
  })

  it('never renders an éloigné profile, even if one slips through the data', () => {
    render(
      <SimilarPeopleList
        profiles={[
          { username: 'close', band: 'tres-proche' },
          { username: 'distant', band: 'eloigne' },
        ]}
      />
    )

    expect(screen.getByRole('link', { name: 'close' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'distant' })).not.toBeInTheDocument()
  })

  it('shows a calm empty state when there are no close profiles yet', () => {
    render(<SimilarPeopleList profiles={[]} />)

    expect(screen.getByText('Pas encore de profils proches')).toBeInTheDocument()
    // No rows, no negative framing, no count.
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })
})
