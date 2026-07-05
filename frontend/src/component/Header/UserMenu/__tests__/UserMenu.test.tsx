import { useQuery } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useLogout } from '@/lib/queries/auth'
import { useAuthStore } from '@/store/auth'
import { UserMenu } from '../UserMenu'

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useQuery: vi.fn() }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
    useNavigate: vi.fn(() => vi.fn()),
  }
})

vi.mock('@/lib/queries/auth', () => ({
  useLogout: vi.fn(),
}))

vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn(),
}))

// Delegate to the selector-aware mock: the component now reads several distinct fields
// (accessToken, role, bootRefreshPending), so a flat mockReturnValue feeds them all the
// same boolean and breaks the bootRefreshPending branch.
function setAuthState(isAuthenticated: boolean) {
  setAuthStore({ accessToken: isAuthenticated ? 'tok' : null, role: 'user' })
}

// Selector-aware mock: applies the component's selector to a fake auth state so
// useAuthStore(s => !!s.accessToken) and useAuthStore(s => s.role === 'admin')
// each resolve correctly (mockReturnValue can't, it ignores the selector).
function setAuthStore(state: {
  accessToken: string | null
  role: 'user' | 'admin' | 'contributor'
}) {
  vi.mocked(useAuthStore).mockImplementation(
    (selector: unknown) => (selector as (s: typeof state) => unknown)(state) as never
  )
}

function setProfile(profile: { username?: string; avatarUrl?: string | null } | null) {
  vi.mocked(useQuery).mockReturnValue({
    data: profile,
    isLoading: false,
  } as unknown as ReturnType<typeof useQuery>)
}

function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: 'Menu utilisateur' }))
}

describe('UserMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setAuthState(false)
    setProfile({ username: 'mathieu', avatarUrl: null })
    vi.mocked(useLogout).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useLogout>)
  })

  it('shows auth shortcuts in the dropdown when the user is not authenticated', () => {
    setAuthState(false)
    render(<UserMenu />)
    openMenu()

    expect(screen.getByText(/Connexion/)).toBeInTheDocument()
    expect(screen.getByText(/S'inscrire/)).toBeInTheDocument()
    expect(screen.queryByText(/Déconnexion/)).not.toBeInTheDocument()
  })

  it('shows profile + logout entries when the user is authenticated', () => {
    setAuthState(true)
    render(<UserMenu />)
    openMenu()

    expect(screen.getByText(/Profil/)).toBeInTheDocument()
    expect(screen.getByText(/Déconnexion/)).toBeInTheDocument()
    expect(screen.queryByText(/Connexion/)).not.toBeInTheDocument()
  })

  it('triggers the logout mutation when the logout entry is clicked', () => {
    const mutate = vi.fn()
    vi.mocked(useLogout).mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useLogout>)
    setAuthState(true)
    render(<UserMenu />)
    openMenu()

    fireEvent.click(screen.getByText(/Déconnexion/))

    expect(mutate).toHaveBeenCalledTimes(1)
  })

  // « Modération » reaches admins and contributors, and points at the reports queue.
  it('shows the Modération link to /admin/reports for an admin', () => {
    setAuthStore({ accessToken: 'tok', role: 'admin' })
    render(<UserMenu />)
    openMenu()

    const link = screen.getByRole('link', { name: /Modération/i })
    expect(link).toHaveAttribute('href', '/admin/reports')
  })

  it('shows the Modération link for a contributor', () => {
    setAuthStore({ accessToken: 'tok', role: 'contributor' })
    render(<UserMenu />)
    openMenu()

    expect(screen.getByRole('link', { name: /Modération/i })).toBeInTheDocument()
  })

  it('hides Modération from a plain user', () => {
    setAuthStore({ accessToken: 'tok', role: 'user' })
    render(<UserMenu />)
    openMenu()

    expect(screen.queryByText(/Modération/i)).not.toBeInTheDocument()
  })

  it('does not probe /profile when unauthenticated (enabled gated on accessToken)', () => {
    setAuthStore({ accessToken: null, role: 'user' })
    render(<UserMenu />)

    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }))
  })

  it('renders the username next to the avatar only when the sidebar is open', () => {
    setAuthState(true)
    setProfile({ username: 'mathieu', avatarUrl: null })

    const { rerender } = render(<UserMenu isSidebarOpen={false} />)
    expect(screen.queryByText('mathieu')).not.toBeInTheDocument()

    rerender(<UserMenu isSidebarOpen={true} />)
    expect(screen.getByText('mathieu')).toBeInTheDocument()
  })
})
