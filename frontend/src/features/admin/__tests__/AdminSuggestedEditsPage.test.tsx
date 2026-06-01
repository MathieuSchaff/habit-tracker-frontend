import { useSuspenseQuery } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useReviewSuggestedEdit } from '@/lib/queries/admin'
import { useAuthStore } from '@/store/auth'
import { renderWithProviders } from '@/test/utils'
import { AdminSuggestedEditsPage } from '../components/AdminSuggestedEditsPage'

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
vi.mock('@/store/auth', () => ({ useAuthStore: vi.fn() }))
vi.mock('@/lib/queries/admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/queries/admin')>()
  return { ...actual, useReviewSuggestedEdit: vi.fn() }
})

function setRole(role: 'user' | 'admin' | 'contributor') {
  vi.mocked(useAuthStore).mockImplementation(
    (selector: unknown) => (selector as (s: { role: typeof role }) => unknown)({ role }) as never
  )
}

const EDIT = {
  id: 'edit-1',
  proposerId: 'u-1',
  targetType: 'product' as const,
  targetId: 'p-1',
  field: 'name',
  proposedValue: 'Corrected',
  status: 'pending' as const,
  reviewedBy: null,
  reviewedAt: null,
  createdAt: '2026-06-01T00:00:00.000Z',
}

let review: ReturnType<typeof useReviewSuggestedEdit>['mutate']

beforeEach(() => {
  setRole('contributor')
  vi.mocked(useSuspenseQuery).mockReturnValue({ data: { items: [EDIT] } } as never)
  review = vi.fn() as never
  vi.mocked(useReviewSuggestedEdit).mockReturnValue({ mutate: review, isPending: false } as never)
})

describe('AdminSuggestedEditsPage', () => {
  it('renders a pending suggestion with the proposed value', () => {
    renderWithProviders(<AdminSuggestedEditsPage />)
    expect(screen.getByText('Corrected')).toBeInTheDocument()
  })

  it('accepts after confirmation', async () => {
    renderWithProviders(<AdminSuggestedEditsPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Accepter' }))
    const confirmDialog = await screen.findByRole('alertdialog')
    await userEvent.click(
      Array.from(confirmDialog.querySelectorAll('button')).find(
        (b) => b.textContent === 'Accepter'
      ) as HTMLButtonElement
    )
    await waitFor(() => {
      expect(review).toHaveBeenCalledWith(
        { id: 'edit-1', body: { status: 'accepted' } },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    })
  })
})
