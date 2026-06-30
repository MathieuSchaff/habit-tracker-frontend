import type { RoleRequestView } from '@aurore/shared'

import { useQuery } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCancelRoleRequest, useSubmitRoleRequest } from '@/lib/queries/role-requests'
import { useAuthStore } from '@/store/auth'
import { renderWithProviders } from '@/test/utils'

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useQuery: vi.fn() }
})

vi.mock('@/store/auth', () => ({ useAuthStore: vi.fn() }))

vi.mock('@/lib/queries/role-requests', () => ({
  roleRequestQueries: { mine: () => ({ queryKey: ['role-requests', 'me'], queryFn: vi.fn() }) },
  useSubmitRoleRequest: vi.fn(),
  useCancelRoleRequest: vi.fn(),
}))

import { RoleRequestSection } from '../RoleRequestSection'

function setRole(role: 'user' | 'admin' | 'contributor') {
  vi.mocked(useAuthStore).mockImplementation(
    (selector: unknown) => (selector as (s: { role: typeof role }) => unknown)({ role }) as never
  )
}

function setQuery(state: {
  data?: RoleRequestView | null
  isLoading?: boolean
  isError?: boolean
}) {
  vi.mocked(useQuery).mockReturnValue({
    data: state.data ?? null,
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
  } as unknown as ReturnType<typeof useQuery>)
}

function setMutations() {
  const submit = vi.fn()
  const cancel = vi.fn()
  vi.mocked(useSubmitRoleRequest).mockReturnValue({
    mutate: submit,
    isPending: false,
    isError: false,
    error: null,
  } as unknown as ReturnType<typeof useSubmitRoleRequest>)
  vi.mocked(useCancelRoleRequest).mockReturnValue({
    mutate: cancel,
    isPending: false,
    isError: false,
  } as unknown as ReturnType<typeof useCancelRoleRequest>)
  return { submit, cancel }
}

function makeRequest(overrides: Partial<RoleRequestView>): RoleRequestView {
  return {
    id: 'req-1',
    userId: 'usr-1',
    motivation: 'Une motivation suffisante pour aider.',
    motivationLink: null,
    status: 'pending',
    rejectionReason: null,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: '2026-06-01T10:00:00Z',
    updatedAt: '2026-06-01T10:00:00Z',
    ...overrides,
  }
}

describe('RoleRequestSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setMutations()
  })

  it('renders nothing for a non-user role', () => {
    setRole('contributor')
    setQuery({ data: null })
    renderWithProviders(<RoleRequestSection />)

    expect(screen.queryByRole('heading', { name: 'Devenir modérateur' })).not.toBeInTheDocument()
  })

  it('shows a loading hint while fetching', () => {
    setRole('user')
    setQuery({ isLoading: true })
    renderWithProviders(<RoleRequestSection />)

    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('shows a recoverable message (not the form) when the load fails', () => {
    setRole('user')
    setQuery({ isError: true })
    renderWithProviders(<RoleRequestSection />)

    expect(screen.getByText(/Impossible de charger l'état/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Envoyer la demande' })).not.toBeInTheDocument()
  })

  it('shows the pending state with a working cancel button', async () => {
    setRole('user')
    setQuery({ data: makeRequest({ status: 'pending' }) })
    const { cancel } = setMutations()
    renderWithProviders(<RoleRequestSection />)

    expect(screen.getByText(/en attente/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Annuler ma demande' }))
    expect(cancel).toHaveBeenCalledWith('req-1')
  })

  it('shows the welcome message when the latest request is approved', () => {
    setRole('user')
    setQuery({ data: makeRequest({ status: 'approved' }) })
    renderWithProviders(<RoleRequestSection />)

    expect(screen.getByText(/Votre demande a été acceptée/)).toBeInTheDocument()
  })

  it('shows the rejection reason above the resubmit form when rejected', () => {
    setRole('user')
    setQuery({ data: makeRequest({ status: 'rejected', rejectionReason: 'Trop peu de détails.' }) })
    renderWithProviders(<RoleRequestSection />)

    expect(screen.getByText(/Trop peu de détails/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Envoyer la demande' })).toBeInTheDocument()
  })

  it('keeps the form behind an opt-in for a first-time user, then reveals it', async () => {
    setRole('user')
    setQuery({ data: null })
    renderWithProviders(<RoleRequestSection />)

    // Collapsed by default: just the opt-in, no standing form.
    expect(screen.queryByLabelText(/Votre motivation/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Je veux contribuer' }))

    expect(screen.getByLabelText(/Votre motivation/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Envoyer la demande' })).toBeInTheDocument()
  })

  it('disables submit below the 10-char minimum and enables it at the boundary', async () => {
    setRole('user')
    setQuery({ data: null })
    const { submit } = setMutations()
    renderWithProviders(<RoleRequestSection />)

    await userEvent.click(screen.getByRole('button', { name: 'Je veux contribuer' }))
    const textarea = screen.getByLabelText(/Votre motivation/)
    const submitBtn = screen.getByRole('button', { name: 'Envoyer la demande' })

    await userEvent.type(textarea, '123456789') // 9 chars
    expect(submitBtn).toBeDisabled()

    await userEvent.type(textarea, '0') // 10 chars
    expect(submitBtn).toBeEnabled()

    await userEvent.click(submitBtn)
    await waitFor(() => {
      expect(submit).toHaveBeenCalledWith(
        { motivation: '1234567890' },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    })
  })
})
