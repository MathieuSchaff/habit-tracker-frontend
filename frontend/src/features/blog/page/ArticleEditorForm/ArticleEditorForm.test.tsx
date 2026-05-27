import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCreateArticle, useUpdateArticle } from '@/lib/queries/articles'
import { createTestQueryClient } from '@/test/utils'
import { ArticleEditorForm } from './ArticleEditorForm'
import { ARTICLE_FORM_ERRORS } from './ArticleEditorForm.constants'

vi.mock('@/lib/queries/articles', () => ({
  useCreateArticle: vi.fn(),
  useUpdateArticle: vi.fn(),
}))

// react-markdown ships ESM-only deps; we never enter preview mode in these
// tests, so a stub keeps vitest's module graph manageable.
vi.mock('react-markdown', () => ({ default: () => null }))
vi.mock('remark-gfm', () => ({ default: () => null }))
vi.mock('remark-math', () => ({ default: () => null }))
vi.mock('rehype-katex', () => ({ default: () => null }))

const mockArticle = {
  title: 'Existing Title',
  slug: 'existing-title',
  excerpt: 'Hook line.',
  content: 'Original content.',
  category: 'science' as const,
  coverImageUrl: null,
  publishedAt: null,
}

function renderForm(mode: 'create' | 'edit') {
  const queryClient = createTestQueryClient()
  const onSuccess = vi.fn()
  const onCancel = vi.fn()
  const ui =
    mode === 'create' ? (
      <ArticleEditorForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />
    ) : (
      <ArticleEditorForm
        mode="edit"
        article={mockArticle}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    )
  return {
    onSuccess,
    onCancel,
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
  }
}

describe('ArticleEditorForm', () => {
  const mockCreateMutate = vi.fn()
  const mockUpdateMutate = vi.fn()

  beforeEach(() => {
    mockCreateMutate.mockClear()
    mockUpdateMutate.mockClear()
    vi.mocked(useCreateArticle).mockReturnValue({
      mutate: mockCreateMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateArticle>)
    vi.mocked(useUpdateArticle).mockReturnValue({
      mutate: mockUpdateMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateArticle>)
  })

  it('submits the create form once title, category and content are filled', () => {
    renderForm('create')

    fireEvent.change(screen.getByLabelText(/^Titre/), {
      target: { value: 'Nouveau Guide' },
    })
    fireEvent.change(screen.getByLabelText(/^Catégorie/), {
      target: { value: 'science' },
    })
    fireEvent.change(screen.getByLabelText(/Contenu/), {
      target: { value: '# Body' },
    })

    fireEvent.click(screen.getByRole('button', { name: "Créer l'article" }))

    expect(mockCreateMutate).toHaveBeenCalledTimes(1)
    expect(mockCreateMutate.mock.calls[0][0]).toMatchObject({
      title: 'Nouveau Guide',
      category: 'science',
      content: '# Body',
    })
  })

  it('blocks submit and surfaces field errors when required fields are empty', () => {
    renderForm('create')

    fireEvent.click(screen.getByRole('button', { name: "Créer l'article" }))

    expect(mockCreateMutate).not.toHaveBeenCalled()
    expect(screen.getByText(ARTICLE_FORM_ERRORS.title)).toBeInTheDocument()
    expect(screen.getByText(ARTICLE_FORM_ERRORS.category)).toBeInTheDocument()
    expect(screen.getByText(ARTICLE_FORM_ERRORS.content)).toBeInTheDocument()
  })

  it('submits the edit form with the article slug after a field is modified', () => {
    renderForm('edit')

    fireEvent.change(screen.getByLabelText(/^Titre/), {
      target: { value: 'Revised Title' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(mockUpdateMutate).toHaveBeenCalledTimes(1)
    expect(mockUpdateMutate.mock.calls[0][0]).toMatchObject({
      slug: mockArticle.slug,
      data: expect.objectContaining({ title: 'Revised Title' }),
    })
  })
})
