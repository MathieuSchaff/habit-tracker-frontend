import { useSuspenseQuery } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCreateBan, useLiftBan, useModerateProfileVisibility } from '@/lib/queries/admin'
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
    getRouteApi: () => ({ useParams: () => ({ userId: 'usr-1' }) }),
  }
})

vi.mock('@/lib/queries/admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/queries/admin')>()
  return {
    ...actual,
    useCreateBan: vi.fn(),
    useLiftBan: vi.fn(),
    useModerateProfileVisibility: vi.fn(),
  }
})

import { AdminUserDetailPage } from '../components/AdminUserDetailPage'
import { adminLabels } from '../constants'

type User = {
  id: string
  email: string
  role: 'user' | 'admin'
  emailVerifiedAt: string | null
  createdAt: string
  forcedPrivateByAdmin: boolean
}

type Ban = {
  id: string
  scope: string
  reason: string | null
  expiresAt: string | null
  createdAt: string
  bannedBy: string
}

const DEFAULT_USER: User = {
  id: 'usr-1',
  email: 'target@seed.local',
  role: 'user',
  emailVerifiedAt: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-15T00:00:00Z',
  forcedPrivateByAdmin: false,
}

function setupQueries({ users, bans }: { users?: User[]; bans?: Ban[] }) {
  vi.mocked(useSuspenseQuery).mockImplementation((options: { queryKey: readonly unknown[] }) => {
    // adminKeys.users() → length 2; userBans(userId) → length 4.
    if (options.queryKey.length === 2) {
      return { data: { items: users ?? [DEFAULT_USER] } } as unknown as ReturnType<
        typeof useSuspenseQuery
      >
    }
    if (options.queryKey.length === 4) {
      return { data: bans ?? [] } as unknown as ReturnType<typeof useSuspenseQuery>
    }
    throw new Error(`unmocked suspense query: ${JSON.stringify(options.queryKey)}`)
  })
}

function setupMutations() {
  const createBan = vi.fn()
  const liftBan = vi.fn()
  const moderateProfile = vi.fn()
  vi.mocked(useCreateBan).mockReturnValue({
    mutate: createBan,
    isPending: false,
  } as unknown as ReturnType<typeof useCreateBan>)
  vi.mocked(useLiftBan).mockReturnValue({
    mutate: liftBan,
    isPending: false,
  } as unknown as ReturnType<typeof useLiftBan>)
  vi.mocked(useModerateProfileVisibility).mockReturnValue({
    mutate: moderateProfile,
    isPending: false,
  } as unknown as ReturnType<typeof useModerateProfileVisibility>)
  return { createBan, liftBan, moderateProfile }
}

function clickConfirmDialogButton(label: string) {
  const dialog = screen.getByRole('alertdialog')
  const btn = Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent === label) as
    | HTMLButtonElement
    | undefined
  if (!btn) throw new Error(`Confirm dialog button "${label}" not found`)
  return userEvent.click(btn)
}

describe('AdminUserDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the user's email + role in the header when the user exists", () => {
    setupQueries({})
    setupMutations()
    renderWithProviders(<AdminUserDetailPage />)

    expect(screen.getByRole('heading', { name: 'target@seed.local' })).toBeInTheDocument()
    // Lede shows role + email verification + creation date.
    expect(screen.getByText(/Utilisateur — email vérifié — créé/)).toBeInTheDocument()
  })

  it('renders the "user not found" empty state when no user matches the route param', () => {
    setupQueries({ users: [] })
    setupMutations()
    renderWithProviders(<AdminUserDetailPage />)

    expect(screen.getByText(adminLabels.userNotFound)).toBeInTheDocument()
  })

  it('submits a ban with the default global scope after confirmation', async () => {
    setupQueries({})
    const { createBan } = setupMutations()
    renderWithProviders(<AdminUserDetailPage />)

    // Default scope = global; no reason filled. Click the Bannir button in the create form.
    const submitBtn = screen.getByRole('button', { name: 'Bannir' })
    await userEvent.click(submitBtn)

    // Confirm modal with confirmLabel='Bannir'.
    await screen.findByRole('alertdialog')
    await clickConfirmDialogButton('Bannir')

    await waitFor(() => {
      expect(createBan).toHaveBeenCalledTimes(1)
    })
    expect(createBan).toHaveBeenCalledWith(
      { scope: 'global' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('passes the trimmed reason and ISO-encoded expiresAt to the ban mutation', async () => {
    setupQueries({})
    const { createBan } = setupMutations()
    renderWithProviders(<AdminUserDetailPage />)

    // Both the create-ban card and the profile visibility card have a "Raison (optionnel)"
    // input. The create-ban one is the textarea (rows=2); the visibility one is the text input.
    const reasonField = screen
      .getAllByLabelText(/Raison \(optionnel\)/i)
      .find((el) => el.tagName === 'TEXTAREA')
    if (!reasonField) throw new Error('create-ban reason textarea not found')
    fireEvent.change(reasonField, { target: { value: '  comportement abusif  ' } })

    await userEvent.click(screen.getByRole('button', { name: 'Bannir' }))
    await screen.findByRole('alertdialog')
    await clickConfirmDialogButton('Bannir')

    await waitFor(() => {
      expect(createBan).toHaveBeenCalledTimes(1)
    })
    const [body] = createBan.mock.calls[0]
    expect(body).toMatchObject({ scope: 'global', reason: 'comportement abusif' })
    expect(body.expiresAt).toBeUndefined()
  })

  it('shows the empty state in the bans list when the user has no bans', () => {
    setupQueries({ bans: [] })
    setupMutations()
    renderWithProviders(<AdminUserDetailPage />)

    expect(screen.getByText(adminLabels.emptyBans)).toBeInTheDocument()
  })

  it('lists active bans and lifts one through the confirmation flow', async () => {
    const ban: Ban = {
      id: 'ban-1',
      scope: 'discussion_post',
      reason: 'Spam répété',
      expiresAt: null,
      createdAt: '2026-05-21T09:00:00Z',
      bannedBy: 'admin-1',
    }
    setupQueries({ bans: [ban] })
    const { liftBan } = setupMutations()
    renderWithProviders(<AdminUserDetailPage />)

    expect(screen.getByText('discussion_post')).toBeInTheDocument()
    expect(screen.getByText('Spam répété')).toBeInTheDocument()
    expect(screen.getByText('Permanent')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Lever' }))
    await screen.findByRole('alertdialog')
    await clickConfirmDialogButton('Lever')

    await waitFor(() => {
      expect(liftBan).toHaveBeenCalledWith(
        'ban-1',
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    })
  })

  it('toggles force-private and calls the visibility mutation with forcedPrivate=true', async () => {
    setupQueries({})
    const { moderateProfile } = setupMutations()
    renderWithProviders(<AdminUserDetailPage />)

    // Toggle is unchecked by default since the seed user has forcedPrivateByAdmin=false.
    const toggle = screen.getByRole('switch', { name: /Forcer privé/i })
    expect(toggle).not.toBeChecked()

    await userEvent.click(toggle)

    await screen.findByRole('alertdialog')
    await clickConfirmDialogButton('Forcer privé')

    await waitFor(() => {
      expect(moderateProfile).toHaveBeenCalledTimes(1)
    })
    const [body] = moderateProfile.mock.calls[0]
    expect(body).toMatchObject({ forcedPrivate: true })
  })
})
