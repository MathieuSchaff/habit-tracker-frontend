import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useModerateContent, useResolveReport } from '@/lib/queries/admin'
import { renderWithProviders } from '@/test/utils'

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useSuspenseQuery: vi.fn(), useQuery: vi.fn() }
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

vi.mock('@/lib/queries/admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/queries/admin')>()
  return {
    ...actual,
    useResolveReport: vi.fn(),
    useModerateContent: vi.fn(),
  }
})

import { AdminReportsPage } from '../components/AdminReportsPage'
import { adminLabels } from '../constants'

type ReportItem = {
  id: string
  targetType: 'review' | 'thread' | 'reply' | 'profile'
  targetId: string
  reason: string
  reporterId: string
  reviewedBy: string | null
  status: 'open' | 'resolved' | 'dismissed'
  createdAt: string
}

const REPORTER = {
  id: 'usr-reporter',
  email: 'snitch@seed.local',
  role: 'user' as const,
  emailVerifiedAt: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  forcedPrivateByAdmin: false,
}

const TARGET_USER = {
  id: 'usr-bad',
  email: 'spammer@seed.local',
  role: 'user' as const,
  emailVerifiedAt: null,
  createdAt: '2026-02-01T00:00:00Z',
  forcedPrivateByAdmin: true,
}

const baseReports: ReportItem[] = [
  {
    id: 'rep-1',
    targetType: 'review',
    targetId: 'rev-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    reason: 'Propos insultants',
    reporterId: REPORTER.id,
    reviewedBy: null,
    status: 'open',
    createdAt: '2026-05-21T10:00:00Z',
  },
  {
    id: 'rep-2',
    targetType: 'profile',
    targetId: TARGET_USER.id,
    reason: 'Profil suspect',
    reporterId: REPORTER.id,
    reviewedBy: null,
    status: 'open',
    createdAt: '2026-05-21T11:00:00Z',
  },
]

function setupQueries(reports: ReportItem[]) {
  vi.mocked(useSuspenseQuery).mockImplementation((options: { queryKey: readonly unknown[] }) => {
    const tag = options.queryKey[1] as string
    if (tag === 'reports') {
      return { data: { items: reports } } as unknown as ReturnType<typeof useSuspenseQuery>
    }
    if (tag === 'users') {
      return {
        data: { items: [REPORTER, TARGET_USER] },
      } as unknown as ReturnType<typeof useSuspenseQuery>
    }
    throw new Error(`unmocked suspense query: ${String(tag)}`)
  })
  // No preview by default; per-test overrides re-set when expansion is asserted.
  vi.mocked(useQuery).mockReturnValue({
    data: null,
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof useQuery>)
}

function setupMutations() {
  const resolve = vi.fn()
  const moderate = vi.fn()
  vi.mocked(useResolveReport).mockReturnValue({
    mutate: resolve,
    isPending: false,
  } as unknown as ReturnType<typeof useResolveReport>)
  vi.mocked(useModerateContent).mockReturnValue({
    mutate: moderate,
    isPending: false,
  } as unknown as ReturnType<typeof useModerateContent>)
  return { resolve, moderate }
}

describe('AdminReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the header count and status tabs', () => {
    setupQueries(baseReports)
    setupMutations()
    renderWithProviders(<AdminReportsPage />)

    expect(screen.getByRole('heading', { name: /Signalements/i })).toBeInTheDocument()
    expect(screen.getByText('2 entrée(s)')).toBeInTheDocument()

    expect(screen.getByRole('tab', { name: 'Ouverts' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Résolus' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Rejetés' })).toHaveAttribute('aria-selected', 'false')
  })

  it('shows the empty state when there are no reports', () => {
    setupQueries([])
    setupMutations()
    renderWithProviders(<AdminReportsPage />)

    expect(screen.getByText(adminLabels.emptyReports)).toBeInTheDocument()
  })

  it('renders the reporter email and a code snippet for content-type targets', () => {
    setupQueries([baseReports[0]])
    setupMutations()
    renderWithProviders(<AdminReportsPage />)

    expect(screen.getByText('snitch@seed.local')).toBeInTheDocument()
    expect(screen.getByText('Propos insultants')).toBeInTheDocument()
    // Code snippet truncates id to 8 chars: review#rev-aaaa
    expect(screen.getByText(/review#rev-aaaa/)).toBeInTheDocument()
  })

  it('renders a user-snapshot block + "Voir le profil" link when targetType is profile', () => {
    setupQueries([baseReports[1]])
    setupMutations()
    renderWithProviders(<AdminReportsPage />)

    expect(screen.getByText('spammer@seed.local')).toBeInTheDocument()
    // forcedPrivateByAdmin pill must appear for the target user.
    expect(screen.getByText(adminLabels.pillForced)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Voir le profil/i })
    expect(link).toHaveAttribute('href', '/admin/users/$userId')
  })

  it('calls the resolve mutation with status=resolved after confirmation', async () => {
    setupQueries([baseReports[0]])
    const { resolve } = setupMutations()
    renderWithProviders(<AdminReportsPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Résoudre' }))

    // useConfirm opens an alertdialog with "Confirmer"-style action button; we used confirmLabel='Résoudre'.
    const confirmDialog = await screen.findByRole('alertdialog')
    await userEvent.click(
      Array.from(confirmDialog.querySelectorAll('button')).find(
        (b) => b.textContent === 'Résoudre'
      ) as HTMLButtonElement
    )

    await waitFor(() => {
      expect(resolve).toHaveBeenCalledWith(
        { id: 'rep-1', body: { status: 'resolved' } },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    })
  })

  it('does not call the mutation when the user cancels the confirmation', async () => {
    setupQueries([baseReports[0]])
    const { resolve } = setupMutations()
    renderWithProviders(<AdminReportsPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Rejeter' }))
    const confirmDialog = await screen.findByRole('alertdialog')
    await userEvent.click(
      Array.from(confirmDialog.querySelectorAll('button')).find(
        (b) => b.textContent === 'Annuler'
      ) as HTMLButtonElement
    )

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })
    expect(resolve).not.toHaveBeenCalled()
  })

  it('switches the active tab when the user picks a different status', () => {
    setupQueries(baseReports)
    setupMutations()
    renderWithProviders(<AdminReportsPage />)

    fireEvent.click(screen.getByRole('tab', { name: 'Résolus' }))

    expect(screen.getByRole('tab', { name: 'Résolus' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Ouverts' })).toHaveAttribute('aria-selected', 'false')
  })
})
