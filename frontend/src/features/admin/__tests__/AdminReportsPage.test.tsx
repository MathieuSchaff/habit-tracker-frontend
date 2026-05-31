import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useEscalateReport, useModerateContent, useResolveReport } from '@/lib/queries/admin'
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
    useEscalateReport: vi.fn(),
  }
})

vi.mock('@/store/auth', () => ({ useAuthStore: vi.fn() }))

import { useAuthStore } from '@/store/auth'
import { AdminReportsPage } from '../components/AdminReportsPage'
import { adminLabels } from '../constants'

function setRole(role: 'user' | 'admin' | 'contributor') {
  vi.mocked(useAuthStore).mockImplementation(
    (selector: unknown) => (selector as (s: { role: typeof role }) => unknown)({ role }) as never
  )
}

type ReportItem = {
  id: string
  targetType: 'review' | 'thread' | 'reply' | 'profile' | 'product' | 'ingredient'
  targetId: string
  reason: string
  reporterId: string
  reviewedBy: string | null
  status: 'open' | 'resolved' | 'dismissed'
  escalatedAt: string | null
  escalatedBy: string | null
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
    escalatedAt: null,
    escalatedBy: null,
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
    escalatedAt: null,
    escalatedBy: null,
    createdAt: '2026-05-21T11:00:00Z',
  },
]

function setupQueries(reports: ReportItem[], preview: unknown = null) {
  vi.mocked(useSuspenseQuery).mockImplementation((options: { queryKey: readonly unknown[] }) => {
    const tag = options.queryKey[1] as string
    if (tag === 'reports') {
      return { data: { items: reports } } as unknown as ReturnType<typeof useSuspenseQuery>
    }
    throw new Error(`unmocked suspense query: ${String(tag)}`)
  })
  // users() + contentPreview() are both useQuery; branch on the key tag.
  vi.mocked(useQuery).mockImplementation((options: { queryKey?: readonly unknown[] }) => {
    const tag = options?.queryKey?.[1] as string | undefined
    if (tag === 'users') {
      return {
        data: { items: [REPORTER, TARGET_USER] },
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof useQuery>
    }
    if (tag === 'preview') {
      return { data: preview, isLoading: false, isError: false } as unknown as ReturnType<
        typeof useQuery
      >
    }
    return {
      data: null,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useQuery>
  })
}

function setupMutations() {
  const resolve = vi.fn()
  const moderate = vi.fn()
  const escalate = vi.fn()
  vi.mocked(useResolveReport).mockReturnValue({
    mutate: resolve,
    isPending: false,
  } as unknown as ReturnType<typeof useResolveReport>)
  vi.mocked(useModerateContent).mockReturnValue({
    mutate: moderate,
    isPending: false,
  } as unknown as ReturnType<typeof useModerateContent>)
  vi.mocked(useEscalateReport).mockReturnValue({
    mutate: escalate,
    isPending: false,
  } as unknown as ReturnType<typeof useEscalateReport>)
  return { resolve, moderate, escalate }
}

describe('AdminReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setRole('admin')
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

  // ADR-0006 S1: a contributor (« modérateur ») owns the queue but gets a
  // content-only view — no account PII (reporter/target emails), no admin-only
  // « Voir le profil » / global-ban affordances.
  it('hides reporter email from a contributor (no account PII)', () => {
    setRole('contributor')
    setupQueries([baseReports[0]])
    setupMutations()
    renderWithProviders(<AdminReportsPage />)

    expect(screen.queryByText('snitch@seed.local')).not.toBeInTheDocument()
    // The report itself is still shown — the moderator can act on content.
    expect(screen.getByText('Propos insultants')).toBeInTheDocument()
  })

  it('hides the « Voir le profil » link + target email from a contributor', () => {
    setRole('contributor')
    setupQueries([baseReports[1]])
    setupMutations()
    renderWithProviders(<AdminReportsPage />)

    expect(screen.queryByText('spammer@seed.local')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Voir le profil/i })).not.toBeInTheDocument()
  })

  // S2 (ADR-0006): a catalogue-sheet report previews the fiche + moderates it
  // through the same panel (TARGET_TO_MODERATE maps product → products).
  it('previews a product-sheet report and hides the fiche', async () => {
    const productReport: ReportItem = {
      id: 'rep-prod',
      targetType: 'product',
      targetId: 'prod-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      reason: 'Fiche pub / spam',
      reporterId: REPORTER.id,
      reviewedBy: null,
      status: 'open',
      escalatedAt: null,
      escalatedBy: null,
      createdAt: '2026-05-30T10:00:00Z',
    }
    setupQueries([productReport], {
      kind: 'product',
      id: productReport.targetId,
      name: 'Spam Serum',
      brand: 'SpamBrand',
      slug: 'spam-serum',
      moderationStatus: 'visible',
      moderationReason: null,
      authorId: 'usr-author',
      authorUsername: null,
      createdAt: '2026-05-30T09:00:00Z',
    })
    const { moderate } = setupMutations()
    renderWithProviders(<AdminReportsPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Voir' }))
    expect(await screen.findByText('Spam Serum')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Masquer' }))
    const confirmDialog = await screen.findByRole('alertdialog')
    await userEvent.click(
      Array.from(confirmDialog.querySelectorAll('button')).find(
        (b) => b.textContent === 'Masquer'
      ) as HTMLButtonElement
    )

    await waitFor(() => {
      expect(moderate).toHaveBeenCalledWith(
        { target: 'products', id: productReport.targetId, body: { status: 'hidden' } },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    })
  })

  it('switches the active tab when the user picks a different status', () => {
    setupQueries(baseReports)
    setupMutations()
    renderWithProviders(<AdminReportsPage />)

    fireEvent.click(screen.getByRole('tab', { name: 'Résolus' }))

    expect(screen.getByRole('tab', { name: 'Résolus' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Ouverts' })).toHaveAttribute('aria-selected', 'false')
  })

  // S3 (ADR-0006): escalate-to-admin. Orthogonal to status — a row stays open while
  // escalated; the « Escaladés » view is admin-only.
  it('escalates an open report after confirmation', async () => {
    setupQueries([baseReports[0]])
    const { escalate } = setupMutations()
    renderWithProviders(<AdminReportsPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Escalader' }))
    const confirmDialog = await screen.findByRole('alertdialog')
    await userEvent.click(
      Array.from(confirmDialog.querySelectorAll('button')).find(
        (b) => b.textContent === 'Escalader'
      ) as HTMLButtonElement
    )

    await waitFor(() => {
      expect(escalate).toHaveBeenCalledWith(
        'rep-1',
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    })
  })

  it('shows the Escaladé badge and hides the escalate button on an escalated report', () => {
    const escalated: ReportItem = {
      ...baseReports[0],
      escalatedAt: '2026-05-31T10:00:00Z',
      escalatedBy: 'usr-modo',
    }
    setupQueries([escalated])
    setupMutations()
    renderWithProviders(<AdminReportsPage />)

    expect(screen.getByText('Escaladé')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Escalader' })).not.toBeInTheDocument()
  })

  it('shows the Escaladés tab for an admin', () => {
    setupQueries(baseReports)
    setupMutations()
    renderWithProviders(<AdminReportsPage />)

    expect(screen.getByRole('tab', { name: 'Escaladés' })).toBeInTheDocument()
  })

  it('hides the Escaladés tab from a contributor', () => {
    setRole('contributor')
    setupQueries(baseReports)
    setupMutations()
    renderWithProviders(<AdminReportsPage />)

    expect(screen.queryByRole('tab', { name: 'Escaladés' })).not.toBeInTheDocument()
  })
})
