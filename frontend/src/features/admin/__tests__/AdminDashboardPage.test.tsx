import { useSuspenseQuery } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
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
    Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string }) => (
      <a href={to} {...(rest as object)}>
        {children}
      </a>
    ),
  }
})

import { AdminDashboardPage } from '../components/AdminDashboardPage'
import { adminLabels } from '../constants'

function mockDashboard(data: {
  openReports: number
  activeBans: number
  hiddenReviews: number
  hiddenThreads: number
  hiddenReplies: number
  forcedPrivateProfiles: number
  pendingRoleRequests: number
}) {
  vi.mocked(useSuspenseQuery).mockReturnValue({ data } as unknown as ReturnType<
    typeof useSuspenseQuery
  >)
}

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all five moderation stat cards with their counts', () => {
    mockDashboard({
      openReports: 7,
      activeBans: 2,
      hiddenReviews: 3,
      hiddenThreads: 1,
      hiddenReplies: 4,
      forcedPrivateProfiles: 5,
      pendingRoleRequests: 6,
    })
    renderWithProviders(<AdminDashboardPage />)

    expect(screen.getByText(adminLabels.statOpenReports)).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()

    expect(screen.getByText(adminLabels.statActiveBans)).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()

    // Total hidden = 3 + 1 + 4 = 8
    expect(screen.getByText('8')).toBeInTheDocument()

    expect(screen.getByText(adminLabels.statForcedPrivate)).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()

    expect(screen.getByText(adminLabels.statPendingRoleRequests)).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
  })

  it('breaks down hidden content by kind in the third card', () => {
    mockDashboard({
      openReports: 0,
      activeBans: 0,
      hiddenReviews: 12,
      hiddenThreads: 4,
      hiddenReplies: 9,
      forcedPrivateProfiles: 0,
      pendingRoleRequests: 0,
    })
    renderWithProviders(<AdminDashboardPage />)

    expect(screen.getByText(/12 review · 4 thread · 9 reply/)).toBeInTheDocument()
  })

  it('renders all stat cards as links to deep-link admin pages', () => {
    mockDashboard({
      openReports: 0,
      activeBans: 0,
      hiddenReviews: 0,
      hiddenThreads: 0,
      hiddenReplies: 0,
      forcedPrivateProfiles: 0,
      pendingRoleRequests: 0,
    })
    renderWithProviders(<AdminDashboardPage />)

    const links = screen.getAllByRole('link')
    // 5 stat cards = 5 links: /admin/reports (x2) + /admin/users (x2) + /admin/role-requests (x1).
    expect(links).toHaveLength(5)
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs.filter((h) => h === '/admin/reports')).toHaveLength(2)
    expect(hrefs.filter((h) => h === '/admin/users')).toHaveLength(2)
    expect(hrefs.filter((h) => h === '/admin/role-requests')).toHaveLength(1)
  })
})
