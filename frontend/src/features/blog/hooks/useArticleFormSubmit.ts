import type { BlogCategory } from '@aurore/shared'

import { useState } from 'react'

import { useCreateArticle, useUpdateArticle } from '@/lib/queries/articles'
import { ARTICLE_FORM_ERRORS } from '../page/ArticleEditorForm/ArticleEditorForm.constants'

export type ArticleData = {
  title: string
  slug: string
  excerpt: string | null
  content: string
  category: BlogCategory
  coverImageUrl: string | null
  publishedAt: string | null
}

export type ArticleFormData = {
  title: string
  category: BlogCategory | ''
  slug: string
  excerpt: string
  coverImageUrl: string
  publishedAt: string
  content: string
}

// Article validates several fields at once, so it keeps a per-field map
// instead of the sibling forms' single fieldError.
export type ArticleFormErrors = Partial<Record<keyof ArticleFormData | 'global', string>>

type CreateArgs = { mode: 'create'; article?: never }
type EditArgs = { mode: 'edit'; article: ArticleData }

type Args = (CreateArgs | EditArgs) & {
  form: ArticleFormData
  onSuccess: (category: BlogCategory, slug: string) => void
}

export function useArticleFormSubmit(args: Args) {
  const createArticle = useCreateArticle()
  const updateArticle = useUpdateArticle()
  const [errors, setErrors] = useState<ArticleFormErrors>({})

  const isPending = createArticle.isPending || updateArticle.isPending

  function validate(): ArticleFormErrors {
    const e: ArticleFormErrors = {}
    if (!args.form.title.trim()) e.title = ARTICLE_FORM_ERRORS.title
    if (!args.form.category) e.category = ARTICLE_FORM_ERRORS.category
    if (!args.form.content.trim()) e.content = ARTICLE_FORM_ERRORS.content
    return e
  }

  function clearFieldError(key: keyof ArticleFormData) {
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    const data = {
      title: args.form.title.trim(),
      category: args.form.category as BlogCategory,
      slug: args.form.slug.trim() || undefined,
      excerpt: args.form.excerpt.trim() || undefined,
      coverImageUrl: args.form.coverImageUrl.trim() || undefined,
      publishedAt: args.form.publishedAt ? `${args.form.publishedAt}:00Z` : null,
      content: args.form.content,
    }

    const onError = (verb: string) => (err: unknown) => {
      const msg = (err as Error).message.toLowerCase()
      setErrors(msg.includes('slug') ? { slug: 'Ce slug est déjà utilisé' } : { global: verb })
    }

    if (args.mode === 'create') {
      createArticle.mutate(data, {
        onSuccess: (result) => args.onSuccess(result.category, result.slug),
        onError: onError('Création impossible. Réessaie.'),
      })
    } else {
      updateArticle.mutate(
        { slug: args.article.slug, data },
        {
          onSuccess: (result) => args.onSuccess(result.category, result.slug),
          onError: onError('Mise à jour impossible. Réessaie.'),
        }
      )
    }
  }

  const submitLabel =
    args.mode === 'create'
      ? createArticle.isPending
        ? 'Création…'
        : "Créer l'article"
      : updateArticle.isPending
        ? 'Enregistrement…'
        : 'Enregistrer'

  return { handleSubmit, errors, clearFieldError, isPending, submitLabel }
}
