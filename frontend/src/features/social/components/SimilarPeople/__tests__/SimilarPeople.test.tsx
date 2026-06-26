import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  createLink: vi.fn(() => vi.fn(({ children }) => children)),
  Link: ({
    to,
    params,
    children,
  }: {
    to: string
    params?: Record<string, string>
    children: React.ReactNode
  }) => {
    const href = params
      ? Object.entries(params).reduce((acc, [k, v]) => acc.replace(`$${k}`, v), to)
      : to
    return <a href={href}>{children}</a>
  },
}))

const useQueryMock = vi.fn()
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useQuery: (opts: unknown) => useQueryMock(opts) }
})

import { SimilarPeople } from '../SimilarPeople'

describe('SimilarPeople', () => {
  beforeEach(() => {
    useQueryMock.mockReset()
    useQueryMock.mockReturnValue({
      data: { profiles: [{ username: 'lea', band: 'tres-proche' }] },
      isLoading: false,
    })
  })

  function lastQueryKey() {
    const calls = useQueryMock.mock.calls
    return (calls[calls.length - 1]?.[0] as { queryKey: unknown[] }).queryKey
  }

  it('shows the passive similar list by default', () => {
    render(<SimilarPeople />)

    expect(screen.getByRole('link', { name: 'lea' })).toBeInTheDocument()
    expect(lastQueryKey()).toEqual(['social', 'similar'])
  })

  it('switches to concern search when a concern is picked', () => {
    render(<SimilarPeople />)

    fireEvent.click(screen.getByRole('radio', { name: 'Rosacée' }))

    expect(lastQueryKey()).toEqual(['social', 'profiles', 'search', 'rosacee'])
  })
})
