import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/store/auth'

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
    Outlet: () => null,
  }
})

vi.mock('@/store/auth', () => ({ useAuthStore: vi.fn() }))

import { AdminLayout } from '../components/AdminLayout'

function setRole(role: 'user' | 'admin' | 'contributor') {
  vi.mocked(useAuthStore).mockImplementation(
    (selector: unknown) => (selector as (s: { role: typeof role }) => unknown)({ role }) as never
  )
}

describe('AdminLayout nav visibility (ADR-0006 S1)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows all three nav items to an admin', () => {
    setRole('admin')
    render(<AdminLayout />)

    expect(screen.getByText('Tableau de bord')).toBeInTheDocument()
    expect(screen.getByText('Utilisateurs')).toBeInTheDocument()
    expect(screen.getByText('Signalements')).toBeInTheDocument()
    expect(screen.getByText('Demandes modérateur')).toBeInTheDocument()
  })

  it('shows only Signalements to a contributor (dashboard + users stay admin-only)', () => {
    setRole('contributor')
    render(<AdminLayout />)

    expect(screen.getByText('Signalements')).toBeInTheDocument()
    expect(screen.queryByText('Tableau de bord')).not.toBeInTheDocument()
    expect(screen.queryByText('Utilisateurs')).not.toBeInTheDocument()
    expect(screen.queryByText('Demandes modérateur')).not.toBeInTheDocument()
  })
})
