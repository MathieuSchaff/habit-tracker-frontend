import { useSuspenseQuery } from '@tanstack/react-query'
import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/utils'

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useSuspenseQuery: vi.fn() }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    Link: ({ children, ...rest }: { children: React.ReactNode }) => (
      <a {...(rest as object)}>{children}</a>
    ),
  }
})

import { AdminUsersPage } from '../components/AdminUsersPage'
import { adminLabels } from '../constants'

const baseUsers = [
  {
    id: '019d0000-0000-7000-8000-00000000aaaa',
    email: 'alice@seed.local',
    role: 'user' as const,
    emailVerifiedAt: '2026-01-01T00:00:00Z',
    createdAt: '2026-05-10T00:00:00Z',
    forcedPrivateByAdmin: false,
  },
  {
    id: '019d0000-0000-7000-8000-00000000bbbb',
    email: 'bob@seed.local',
    role: 'admin' as const,
    emailVerifiedAt: null,
    createdAt: '2026-05-09T00:00:00Z',
    forcedPrivateByAdmin: true,
  },
]

function mockUsers(items: typeof baseUsers) {
  vi.mocked(useSuspenseQuery).mockReturnValue({
    data: { items },
  } as unknown as ReturnType<typeof useSuspenseQuery>)
}

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all users when search is empty', () => {
    mockUsers(baseUsers)
    renderWithProviders(<AdminUsersPage />)

    expect(screen.getByText('alice@seed.local')).toBeInTheDocument()
    expect(screen.getByText('bob@seed.local')).toBeInTheDocument()
    expect(screen.getByText(/2 compte\(s\)/)).toBeInTheDocument()
  })

  it('filters the table when typing in the search input (case-insensitive)', () => {
    mockUsers(baseUsers)
    renderWithProviders(<AdminUsersPage />)

    const search = screen.getByLabelText(/Rechercher par email/i)
    fireEvent.change(search, { target: { value: 'ALICE' } })

    expect(screen.getByText('alice@seed.local')).toBeInTheDocument()
    expect(screen.queryByText('bob@seed.local')).not.toBeInTheDocument()
    expect(screen.getByText(/1 filtré/)).toBeInTheDocument()
  })

  it('shows the contextual empty state when search has no match', () => {
    mockUsers(baseUsers)
    renderWithProviders(<AdminUsersPage />)

    fireEvent.change(screen.getByLabelText(/Rechercher par email/i), {
      target: { value: 'nope' },
    })
    expect(screen.getByText(adminLabels.emptyUsersFiltered)).toBeInTheDocument()
  })

  it('renders the "Forcé" pill only for users with forcedPrivateByAdmin', () => {
    mockUsers(baseUsers)
    renderWithProviders(<AdminUsersPage />)

    // bob has forcedPrivateByAdmin = true; one pill must appear.
    expect(screen.getAllByText('Forcé')).toHaveLength(1)
  })

  it('shows the no-users empty state when the list is empty', () => {
    mockUsers([])
    renderWithProviders(<AdminUsersPage />)
    expect(screen.getByText(adminLabels.emptyUsers)).toBeInTheDocument()
  })
})
