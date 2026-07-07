import type { BlogCategory } from '@aurore/shared'
import { BLOG_CATEGORY_LABELS, BLOG_CATEGORY_VALUES } from '@aurore/shared'

import { Eye, EyeOff } from 'lucide-react'
import { lazy, Suspense, useRef, useState } from 'react'

import { Button } from '@/component/Button/Button'
import { FormMessage } from '@/component/Feedback/ui/FormMessage/FormMessage'
import { FormActions } from '@/component/Input/FormActions/FormActions'
import { Input } from '@/component/Input/Input'
import type { SelectOption } from '@/component/Input/Select/Select'
import { Select } from '@/component/Input/Select/Select'
import { Textarea } from '@/component/Input/Textarea/Textarea'
import { RichText } from '@/component/Typography/RichText/RichText'
import {
  type ArticleData,
  type ArticleFormData,
  useArticleFormSubmit,
} from '@/features/blog/hooks/useArticleFormSubmit'
import './ArticleEditorForm.css'

const MarkdownContent = lazy(() => import('@/component/Typography/RichText/MarkdownContent'))

type ArticleEditorFormProps =
  | {
      mode: 'create'
      article?: never
      onSuccess: (category: BlogCategory, slug: string) => void
      onCancel: () => void
    }
  | {
      mode: 'edit'
      article: ArticleData
      onSuccess: (category: BlogCategory, slug: string) => void
      onCancel: () => void
    }

function toSlug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const CATEGORY_OPTIONS: ReadonlyArray<SelectOption<BlogCategory>> = BLOG_CATEGORY_VALUES.map(
  (v) => ({ value: v, label: BLOG_CATEGORY_LABELS[v] })
)

export function ArticleEditorForm({ mode, article, onSuccess, onCancel }: ArticleEditorFormProps) {
  const [form, setForm] = useState<ArticleFormData>({
    title: article?.title ?? '',
    category: article?.category ?? '',
    slug: article?.slug ?? '',
    excerpt: article?.excerpt ?? '',
    coverImageUrl: article?.coverImageUrl ?? '',
    publishedAt: article?.publishedAt ? article.publishedAt.slice(0, 16) : '',
    content: article?.content ?? '',
  })
  const [previewContent, setPreviewContent] = useState(false)
  // Set when the user edits the slug; only read in the title handler, never in render.
  const slugTouched = useRef(mode === 'edit')

  const { handleSubmit, errors, clearFieldError, isPending, submitLabel } = useArticleFormSubmit(
    mode === 'create' ? { mode, form, onSuccess } : { mode, article, form, onSuccess }
  )

  function set<K extends keyof ArticleFormData>(key: K, value: ArticleFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    clearFieldError(key)
  }

  function handleTitleChange(value: string) {
    set('title', value)
    if (!slugTouched.current) set('slug', toSlug(value))
  }

  return (
    <form className="article-editor-form" onSubmit={handleSubmit} noValidate>
      {errors.global && <FormMessage variant="error">{errors.global}</FormMessage>}

      <div className="article-editor-form__row">
        <Input
          label="Titre"
          required
          value={form.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          error={errors.title}
        />
        <Select
          label="Catégorie"
          required
          options={CATEGORY_OPTIONS}
          value={form.category}
          onValueChange={(v) => set('category', v as BlogCategory | '')}
          placeholder="Choisir…"
          error={errors.category}
        />
      </div>

      <Input
        label="Slug"
        value={form.slug}
        onChange={(e) => {
          slugTouched.current = true
          set('slug', e.target.value)
        }}
        hint="Auto-généré depuis le titre. Laisser vide = valeur auto."
        error={errors.slug}
      />

      <Input
        label="Extrait"
        value={form.excerpt}
        onChange={(e) => set('excerpt', e.target.value)}
        hint="Max 500 caractères"
      />

      <Input
        label="Image de couverture (URL)"
        type="url"
        value={form.coverImageUrl}
        onChange={(e) => set('coverImageUrl', e.target.value)}
      />

      <Input
        label="Publication (UTC)"
        type="datetime-local"
        value={form.publishedAt}
        onChange={(e) => set('publishedAt', e.target.value)}
        hint="Laisser vide = brouillon"
      />

      <div className="article-editor-form__content-header">
        <span className="article-editor-form__content-label">
          Contenu <span aria-hidden="true">*</span>
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPreviewContent((p) => !p)}
        >
          {previewContent ? <EyeOff size={14} /> : <Eye size={14} />}
          {previewContent ? 'Éditer' : 'Aperçu'}
        </Button>
      </div>

      {previewContent ? (
        <div className="article-editor-form__preview">
          <RichText>
            <Suspense fallback={<p>{form.content}</p>}>
              <MarkdownContent>{form.content}</MarkdownContent>
            </Suspense>
          </RichText>
        </div>
      ) : (
        <Textarea
          value={form.content}
          onChange={(e) => set('content', e.target.value)}
          className="article-editor-form__content-textarea"
          aria-label="Contenu (requis)"
          error={errors.content}
        />
      )}

      <FormActions onCancel={onCancel} isPending={isPending} submitLabel={submitLabel} />
    </form>
  )
}
