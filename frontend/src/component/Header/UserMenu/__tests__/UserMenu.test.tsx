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

vi.mock('@/lib/queries/auth', () => ({
  useLogout: vi.fn(),
}))

vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn(),
}))

function setAuthState(isAuthenticated: boolean) {
  vi.mocked(useAuthStore).mockReturnValue(isAuthenticated as never)
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

  it('renders the username next to the avatar only when the sidebar is open', () => {
    setAuthState(true)
    setProfile({ username: 'mathieu', avatarUrl: null })

    const { rerender } = render(<UserMenu isSidebarOpen={false} />)
    expect(screen.queryByText('mathieu')).not.toBeInTheDocument()

    rerender(<UserMenu isSidebarOpen={true} />)
    expect(screen.getByText('mathieu')).toBeInTheDocument()
  })
})
