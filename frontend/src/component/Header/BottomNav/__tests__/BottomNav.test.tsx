import * as routerMod from '@tanstack/react-router'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useDemo, useLogout } from '@/lib/queries/auth'
import { useAuthStore } from '@/store/auth'
import { BottomNav } from '../BottomNav'

vi.mock('@/lib/queries/auth', () => ({
  useLogout: vi.fn(),
  useDemo: vi.fn(),
}))

vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn(),
}))

// ThemeToggle pulls a Zustand store we don't care about here; stub it out.
vi.mock('@/component/ThemeToggle/ThemeToggle', () => ({
  ThemeToggle: () => null,
}))

function setRouterState(pathname: string) {
  vi.spyOn(routerMod, 'useRouterState').mockReturnValue(pathname as never)
}

// Selector-aware: the component reads both `!!s.accessToken` and `s.bootRefreshPending`,
// so a flat boolean mock would feed the wrong value to the second selector.
function setAuthState(isAuthenticated: boolean) {
  const state = { accessToken: isAuthenticated ? 'tok' : null, bootRefreshPending: false }
  vi.mocked(useAuthStore).mockImplementation(
    (selector: unknown) => (selector as (s: typeof state) => unknown)(state) as never
  )
}

describe('BottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setRouterState('/collection/')
    setAuthState(false)
    vi.mocked(useLogout).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useLogout>)
    vi.mocked(useDemo).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useDemo>)
  })

  it('opens the More sheet on trigger click', () => {
    render(<BottomNav />)

    const trigger = screen.getByRole('button', { name: 'Ouvrir le menu' })
    fireEvent.click(trigger)

    expect(screen.getByRole('button', { name: 'Fermer le menu' })).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Menu supplémentaire' })).toHaveAttribute('open')
  })

  it('shows auth entry points when the user is not authenticated', () => {
    setAuthState(false)
    render(<BottomNav />)

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }))

    expect(screen.getByText(/Connexion/)).toBeInTheDocument()
    expect(screen.getByText(/S'inscrire/)).toBeInTheDocument()
    expect(screen.queryByText(/Déconnexion/)).not.toBeInTheDocument()
  })

  it('shows profile + logout when the user is authenticated', () => {
    setAuthState(true)
    render(<BottomNav />)

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }))

    expect(screen.getByText(/Profil/)).toBeInTheDocument()
    expect(screen.getByText(/Déconnexion/)).toBeInTheDocument()
    expect(screen.queryByText(/Connexion/)).not.toBeInTheDocument()
  })

  it('shows a demo entry instead of Collection when not authenticated', () => {
    setAuthState(false)
    render(<BottomNav />)

    expect(screen.getByRole('button', { name: /Essayer Aurore/ })).toBeInTheDocument()
    expect(screen.queryByText('Collection')).not.toBeInTheDocument()
  })

  it('fires the demo mutation when the try button is clicked', () => {
    const mutate = vi.fn()
    vi.mocked(useDemo).mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useDemo>)
    setAuthState(false)
    render(<BottomNav />)

    fireEvent.click(screen.getByRole('button', { name: /Essayer Aurore/ }))

    expect(mutate).toHaveBeenCalledTimes(1)
  })

  it('hides the demo entry when authenticated', () => {
    setAuthState(true)
    render(<BottomNav />)

    // Link (Collection) renders bare children without a RouterProvider, so the
    // reliable discriminator is the absence of the anon-only demo button.
    expect(screen.queryByRole('button', { name: /Essayer Aurore/ })).not.toBeInTheDocument()
  })

  it('fires the logout mutation when the logout button is clicked', () => {
    const mutate = vi.fn()
    vi.mocked(useLogout).mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useLogout>)
    setAuthState(true)
    render(<BottomNav />)

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }))
    fireEvent.click(screen.getByRole('button', { name: /Déconnexion/ }))

    expect(mutate).toHaveBeenCalledTimes(1)
  })
})
