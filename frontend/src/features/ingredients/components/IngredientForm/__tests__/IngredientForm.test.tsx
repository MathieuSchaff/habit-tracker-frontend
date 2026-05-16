import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  useCreateIngredient,
  useUpdateIngredient,
  useUpdateIngredientTags,
} from '@/lib/queries/ingredients'
import { useAuthStore } from '@/store/auth'
import { createTestQueryClient } from '@/test/utils'
import { IngredientForm } from '../IngredientForm'

vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('@/lib/queries/ingredients', () => ({
  useCreateIngredient: vi.fn(),
  useUpdateIngredient: vi.fn(),
  useUpdateIngredientTags: vi.fn(),
  ingredientQueries: {
    bySlug: vi.fn((slug) => ({
      queryKey: ['ingredients', 'slug', slug],
      queryFn: vi.fn(),
    })),
    products: vi.fn((slug) => ({
      queryKey: ['ingredients', slug, 'products'],
      queryFn: vi.fn(),
    })),
    tags: vi.fn((id) => ({
      queryKey: ['ingredients', id, 'tags'],
      queryFn: vi.fn(),
    })),
  },
}))

vi.mock('@/lib/queries/tags', () => ({
  tagQueries: {
    list: vi.fn(() => ({
      queryKey: ['tags', 'list'],
      queryFn: vi.fn(),
      data: [],
    })),
  },
}))

const mockIngredient = {
  id: 'i1',
  slug: 'retinol',
  name: 'Retinol',
  type: 'skincare' as const,
  category: 'actif',
  description: 'Old description',
  content: 'Old content',
  updatedAt: '2024-01-01T10:00:00Z',
}

describe('IngredientForm - Conflict Resolution', () => {
  it('should handle 409 conflict during update and allow field restoration', async () => {
    ;(useAuthStore as any).mockReturnValue({ isAdmin: false })
    const queryClient = createTestQueryClient()
    const mockOnSuccess = vi.fn()
    const mockMutateAsync = vi.fn()

    ;(useUpdateIngredient as any).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    })
    ;(useCreateIngredient as any).mockReturnValue({ isPending: false })
    ;(useUpdateIngredientTags as any).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue([]),
      isPending: false,
    })

    const conflictError = new Error('Conflict')
    ;(conflictError as any).status = 409
    mockMutateAsync.mockRejectedValueOnce(conflictError)

    const freshIngredient = {
      ...mockIngredient,
      description: 'Server edited description',
      updatedAt: '2024-01-01T10:05:00Z',
    }

    vi.spyOn(queryClient, 'fetchQuery').mockResolvedValueOnce(freshIngredient)

    render(
      <QueryClientProvider client={queryClient}>
        <IngredientForm mode="edit" ingredient={mockIngredient} onSuccess={mockOnSuccess} />
      </QueryClientProvider>
    )

    const descriptionField = screen.getByLabelText(/Description/)
    fireEvent.change(descriptionField, { target: { value: 'My local draft' } })

    const saveButton = screen.getByRole('button', { name: /Enregistrer/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/Conflit détecté/i)).toBeInTheDocument()
    })

    expect(descriptionField).toHaveValue('Server edited description')

    // Banner description also contains "Ton brouillon" — match by count, not unique.
    const draftHints = screen.getAllByText(/Ton brouillon/i)
    expect(draftHints.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('My local draft')).toBeInTheDocument()

    const restoreButton = screen.getByRole('button', { name: /Restaurer/i })
    fireEvent.click(restoreButton)

    expect(descriptionField).toHaveValue('My local draft')

    mockMutateAsync.mockResolvedValueOnce({ ...mockIngredient, slug: 'retinol' })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: 'My local draft',
          }),
        })
      )
      const lastCall = mockMutateAsync.mock.calls[mockMutateAsync.mock.calls.length - 1][0]
      expect(new Date(lastCall.data.expectedUpdatedAt).toISOString()).toBe(
        new Date('2024-01-01T10:05:00Z').toISOString()
      )
    })

    expect(mockOnSuccess).toHaveBeenCalled()
  })

  it('should only show the slug field if the user is an admin', () => {
    const queryClient = createTestQueryClient()
    ;(useUpdateIngredientTags as any).mockReturnValue({ isPending: false })
    ;(useCreateIngredient as any).mockReturnValue({ isPending: false })
    ;(useUpdateIngredient as any).mockReturnValue({ isPending: false })

    ;(useAuthStore as any).mockReturnValue({ isAdmin: false })
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <IngredientForm mode="edit" ingredient={mockIngredient} onSuccess={vi.fn()} />
      </QueryClientProvider>
    )
    expect(screen.queryByLabelText(/Slug/)).not.toBeInTheDocument()

    ;(useAuthStore as any).mockReturnValue({ isAdmin: true })
    rerender(
      <QueryClientProvider client={queryClient}>
        <IngredientForm mode="edit" ingredient={mockIngredient} onSuccess={vi.fn()} />
      </QueryClientProvider>
    )
    expect(screen.getByLabelText(/Slug/)).toBeInTheDocument()
  })
})
