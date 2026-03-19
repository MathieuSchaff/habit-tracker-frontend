import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Save, Trash2, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import {
  useCreateIngredient,
  useUpdateIngredient,
  useUpdateIngredientTags,
} from '../../../../lib/queries/ingredients'
import { tagQueries } from '../../../../lib/queries/tags'
import '../Edit/IngredientPageEditable.css'

type TagState = {
  tagId: string
  tagName: string
  relevance: 'primary' | 'secondary' | 'avoid'
}

interface IngredientFormProps {
  mode: 'create' | 'edit'
  ingredient?: {
    id: string
    slug: string
    name: string | null
    category: string | null
    description: string | null
    content: string | null
  }
  initialTags?: TagState[]
  onSuccess: (slug: string) => void
}

export function IngredientForm({
  mode,
  ingredient,
  initialTags = [],
  onSuccess,
}: IngredientFormProps) {
  const { data: allTags } = useQuery(tagQueries.list())
  const createIngredient = useCreateIngredient()
  const updateIngredient = useUpdateIngredient()
  const updateTags = useUpdateIngredientTags()

  const [form, setForm] = useState({
    name: ingredient?.name ?? '',
    category: ingredient?.category ?? '',
    description: ingredient?.description ?? '',
    content: ingredient?.content ?? '',
  })

  const [tags, setTags] = useState<TagState[]>(initialTags)
  const [error, setError] = useState<string | null>(null)

  const handleChange = useCallback(
    (field: keyof typeof form) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }))
        setError(null)
      },
    []
  )

  const handleAddTag = (tagId: string) => {
    const tag = allTags?.find((t) => t.id === tagId)
    if (tag && !tags.find((t) => t.tagId === tagId)) {
      setTags((prev) => [...prev, { tagId, tagName: tag.name, relevance: 'secondary' }])
    }
  }

  const handleRemoveTag = (tagId: string) => {
    setTags((prev) => prev.filter((t) => t.tagId !== tagId))
  }

  const handleUpdateRelevance = (tagId: string, relevance: 'primary' | 'secondary' | 'avoid') => {
    setTags((prev) => prev.map((t) => (t.tagId === tagId ? { ...t, relevance } : t)))
  }

  const availableTags = useMemo(
    () => allTags?.filter((at) => !tags.find((t) => t.tagId === at.id)) ?? [],
    [allTags, tags]
  )

  const sortedTagsKey = (arr: { id: string; r: string }[]) =>
    JSON.stringify([...arr].sort((a, b) => a.id.localeCompare(b.id)))

  const isDirty =
    form.name !== (ingredient?.name ?? '') ||
    form.category !== (ingredient?.category ?? '') ||
    form.description !== (ingredient?.description ?? '') ||
    form.content !== (ingredient?.content ?? '') ||
    sortedTagsKey(tags.map((t) => ({ id: t.tagId, r: t.relevance }))) !==
      sortedTagsKey(initialTags.map((t) => ({ id: t.tagId, r: t.relevance })))

  const isPending = createIngredient.isPending || updateIngredient.isPending || updateTags.isPending

  const isSubmitDisabled =
    mode === 'create' ? isPending || !form.name.trim() : isPending || !isDirty

  const submitLabel =
    mode === 'create'
      ? createIngredient.isPending
        ? 'Création…'
        : "Créer l'ingrédient"
      : updateIngredient.isPending || updateTags.isPending
        ? 'Enregistrement…'
        : 'Enregistrer'

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      if (!form.name.trim()) {
        setError("Le nom de l'ingrédient est obligatoire.")
        return
      }

      try {
        if (mode === 'create') {
          const created = await createIngredient.mutateAsync({
            name: form.name.trim(),
            category: form.category.trim() || null,
            description: form.description.trim() || null,
            content: form.content.trim() || null,
          })
          if (tags.length > 0) {
            await updateTags.mutateAsync({
              ingredientId: created.id,
              tags: tags.map((t) => ({ tagId: t.tagId, relevance: t.relevance })),
            })
          }
          onSuccess(created.slug)
        } else {
          const [updated] = await Promise.all([
            updateIngredient.mutateAsync({
              id: ingredient!.id,
              data: {
                name: form.name.trim(),
                category: form.category.trim() || null,
                description: form.description.trim(),
                content: form.content.trim(),
              },
            }),
            updateTags.mutateAsync({
              ingredientId: ingredient!.id,
              tags: tags.map((t) => ({ tagId: t.tagId, relevance: t.relevance })),
            }),
          ])
          onSuccess(updated.slug)
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Une erreur est survenue lors de la sauvegarde.'
        )
      }
    },
    [form, mode, ingredient, tags, createIngredient, updateIngredient, updateTags, onSuccess]
  )

  return (
    <form className="ingredient-edit-form" onSubmit={handleSubmit}>
      {error && <div className="ingredient-edit-form__error">{error}</div>}

      <div className="ingredient-edit-form__field">
        <label className="ingredient-edit-form__label" htmlFor="ingredient-name">
          Nom <span className="ingredient-edit-form__required">*</span>
        </label>
        <input
          id="ingredient-name"
          className="ingredient-edit-form__input"
          type="text"
          value={form.name}
          onChange={handleChange('name')}
          placeholder="Nom de l'ingrédient"
          // biome-ignore lint: autofocus ok
          autoFocus
        />
      </div>

      <div className="ingredient-edit-form__field">
        <label className="ingredient-edit-form__label" htmlFor="ingredient-category">
          Catégorie
        </label>
        <input
          id="ingredient-category"
          className="ingredient-edit-form__input"
          type="text"
          value={form.category}
          onChange={handleChange('category')}
          placeholder="Ex : Actif, Émollient, Conservateur…"
        />
      </div>

      <div className="ingredient-edit-form__field">
        <label className="ingredient-edit-form__label" htmlFor="ingredient-tags">
          Tags
        </label>
        <div className="ingredient-edit-tags">
          {tags.map((tag) => (
            <div key={tag.tagId} className={`edit-tag edit-tag--${tag.relevance}`}>
              <span className="edit-tag__name">{tag.tagName}</span>
              <select
                value={tag.relevance}
                className="edit-tag__relevance"
                onChange={(e) =>
                  handleUpdateRelevance(
                    tag.tagId,
                    e.target.value as 'primary' | 'secondary' | 'avoid'
                  )
                }
              >
                <option value="primary">Principal</option>
                <option value="secondary">Secondaire</option>
                <option value="avoid">À éviter</option>
              </select>
              <button
                type="button"
                className="edit-tag__remove"
                onClick={() => handleRemoveTag(tag.tagId)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="ingredient-edit-add-tag">
          <select
            className="ingredient-edit-form__input"
            onChange={(e) => {
              if (e.target.value) {
                handleAddTag(e.target.value)
                e.target.value = ''
              }
            }}
            value=""
          >
            <option value="" disabled>
              Ajouter un tag...
            </option>
            {availableTags.map((tag: any) => (
              <option key={tag.id} value={tag.id}>
                {tag.name} ({tag.category ?? 'Sans catégorie'})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ingredient-edit-form__field">
        <label className="ingredient-edit-form__label" htmlFor="ingredient-description">
          Description
        </label>
        <textarea
          id="ingredient-description"
          className="ingredient-edit-form__textarea"
          value={form.description}
          onChange={handleChange('description')}
          placeholder="Description de l'ingrédient (Markdown supporté)"
          rows={5}
        />
        <span className="ingredient-edit-form__hint">Markdown supporté</span>
      </div>

      <div className="ingredient-edit-form__field">
        <label className="ingredient-edit-form__label" htmlFor="ingredient-content">
          Contenu
        </label>
        <textarea
          id="ingredient-content"
          className="ingredient-edit-form__textarea"
          value={form.content}
          onChange={handleChange('content')}
          placeholder="Contenu détaillé (Markdown supporté)"
          rows={8}
        />
        <span className="ingredient-edit-form__hint">Markdown supporté</span>
      </div>

      <div className="ingredient-edit-form__actions">
        {mode === 'edit' ? (
          <Link
            to="/ingredients/$slug"
            params={{ slug: ingredient!.slug }}
            className="ingredient-edit-form__btn ingredient-edit-form__btn--cancel"
          >
            <X size={16} />
            Annuler
          </Link>
        ) : (
          <Link
            to="/ingredients/"
            className="ingredient-edit-form__btn ingredient-edit-form__btn--cancel"
          >
            <X size={16} />
            Annuler
          </Link>
        )}
        <button
          type="submit"
          className="ingredient-edit-form__btn ingredient-edit-form__btn--save"
          disabled={isSubmitDisabled}
        >
          <Save size={16} />
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
