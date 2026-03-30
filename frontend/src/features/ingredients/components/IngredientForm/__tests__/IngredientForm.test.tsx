import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  useCreateIngredient,
  useUpdateIngredient,
  useUpdateIngredientTags,
} from '@/lib/queries/ingredients'
import { useAuthStore } from '@/store/auth'
import { IngredientForm } from '../IngredientForm'

// Mocking auth store
vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn(),
}))

// Mocking hooks from queries/ingredients
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

// Mocking hooks from queries/tags
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
  category: 'actif',
  description: 'Old description',
  content: 'Old content',
  updatedAt: '2024-01-01T10:00:00Z',
}

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
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

    // 1. Initial attempt fails with 409
    const conflictError = new Error('Conflict')
    ;(conflictError as any).status = 409
    mockMutateAsync.mockRejectedValueOnce(conflictError)

    // 2. Fetch fresh version after 409
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

    // Change description to our draft
    const descriptionField = screen.getByLabelText(/Description/)
    fireEvent.change(descriptionField, { target: { value: 'My local draft' } })

    // Submit form
    const saveButton = screen.getByRole('button', { name: /Enregistrer/i })
    fireEvent.click(saveButton)

    // Wait for conflict banner to appear
    await waitFor(() => {
      expect(screen.getByText(/Conflit détecté/i)).toBeInTheDocument()
    })

    // Form should now show the server's value
    expect(descriptionField).toHaveValue('Server edited description')

    // But our draft hint should be visible
    const draftHints = screen.getAllByText(/Ton brouillon/i)
    // The banner also contains the text "Ton brouillon" in its description, hence the ambiguity
    expect(draftHints.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('My local draft')).toBeInTheDocument()

    // Restore our draft
    const restoreButton = screen.getByRole('button', { name: /Restaurer/i })
    fireEvent.click(restoreButton)

    // Field should be back to our draft
    expect(descriptionField).toHaveValue('My local draft')

    // Try saving again - it should now use the fresh updatedAt
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
      // Check date separately to avoid issues with exact object matching
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

    // Non-admin
    ;(useAuthStore as any).mockReturnValue({ isAdmin: false })
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <IngredientForm mode="edit" ingredient={mockIngredient} onSuccess={vi.fn()} />
      </QueryClientProvider>
    )
    expect(screen.queryByLabelText(/Slug/)).not.toBeInTheDocument()

    // Admin
    ;(useAuthStore as any).mockReturnValue({ isAdmin: true })
    rerender(
      <QueryClientProvider client={queryClient}>
        <IngredientForm mode="edit" ingredient={mockIngredient} onSuccess={vi.fn()} />
      </QueryClientProvider>
    )
    expect(screen.getByLabelText(/Slug/)).toBeInTheDocument()
  })
})
