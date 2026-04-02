import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ClipboardCopy, Save, X as XIcon } from 'lucide-react'
import { useCallback, useState } from 'react'

import { Button } from '@/component/Button/Button'
import { FormField } from '@/component/Input/FormField/FormField'
import { TagManager } from '@/component/Input/TagManager/TagManager'
import { type TagState, useFormTags } from '@/hooks/useFormTags'
import { isHttpError } from '@/lib/helpers/isHttpError'
import { useAuthStore } from '@/store/auth'
import {
  ingredientQueries,
  useCreateIngredient,
  useUpdateIngredient,
  useUpdateIngredientTags,
} from '../../../../lib/queries/ingredients'
import { tagQueries } from '../../../../lib/queries/tags'
import '../Edit/IngredientPageEditable.css'

interface BaseIngredient {
  id: string
  slug: string
  name: string | null
  category: string | null
  description: string | null
  content: string | null
  updatedAt: string
}

type FormData = {
  name: string
  slug: string
  category: string
  description: string
  content: string
}

const FORM_FIELDS = ['name', 'slug', 'category', 'description', 'content'] as const
type FormFieldKey = (typeof FORM_FIELDS)[number]

const FIELD_LABELS: Record<FormFieldKey, string> = {
  name: 'Nom',
  slug: 'Slug',
  category: 'Catégorie',
  description: 'Description',
  content: 'Contenu',
}

// when a 409 happens, we store the user's draft so they can recover their work
type ConflictState = {
  draft: FormData
  freshUpdatedAt: string
}

type IngredientFormProps =
  | {
      mode: 'create'
      ingredient?: never
      initialTags?: TagState[]
      onSuccess: (slug: string) => void
    }
  | {
      mode: 'edit'
      ingredient: BaseIngredient
      initialTags?: TagState[]
      onSuccess: (slug: string) => void
    }

export function IngredientForm({
  mode,
  ingredient,
  initialTags = [],
  onSuccess,
}: IngredientFormProps) {
  const qc = useQueryClient()
  const { data: allTags } = useQuery(tagQueries.list())
  const createIngredient = useCreateIngredient()
  const updateIngredient = useUpdateIngredient()
  const updateTags = useUpdateIngredientTags()

  const { isAdmin } = useAuthStore()
  const [form, setForm] = useState<FormData>({
    name: ingredient?.name ?? '',
    slug: ingredient?.slug ?? '',
    category: ingredient?.category ?? '',
    description: ingredient?.description ?? '',
    content: ingredient?.content ?? '',
  })

  const { tags, addTag, removeTag, updateRelevance, availableTags, isTagsDirty } = useFormTags({
    initialTags,
    allTags,
  })

  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<ConflictState | null>(null)

  // after a conflict, we use the fresh updatedAt for the next save attempt
  // so the optimistic lock doesn't fail again on the same stale value
  const [updatedAtOverride, setUpdatedAtOverride] = useState<string | null>(null)

  const handleChange = useCallback(
    (field: FormFieldKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
      setError(null)
    },
    []
  )

  const isDirty =
    form.name !== (ingredient?.name ?? '') ||
    form.slug !== (ingredient?.slug ?? '') ||
    form.category !== (ingredient?.category ?? '') ||
    form.description !== (ingredient?.description ?? '') ||
    form.content !== (ingredient?.content ?? '') ||
    isTagsDirty

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
    async (e: React.SubmitEvent<HTMLFormElement>) => {
      e.preventDefault()

      if (!form.name.trim()) {
        setError("Le nom de l'ingrédient est obligatoire.")
        return
      }

      try {
        if (mode === 'create') {
          const created = await createIngredient.mutateAsync({
            name: form.name.trim(),
            slug: isAdmin && form.slug.trim() ? form.slug.trim() : undefined,
            category: form.category.trim() || undefined,
            description: form.description.trim() || undefined,
            content: form.content.trim() || undefined,
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
              id: ingredient.id,
              data: {
                name: form.name.trim(),
                slug: isAdmin && form.slug.trim() ? form.slug.trim() : undefined,
                category: form.category.trim() || undefined,
                description: form.description.trim() || undefined,
                content: form.content.trim() || undefined,
                expectedUpdatedAt: new Date(updatedAtOverride ?? ingredient.updatedAt),
              },
            }),
            updateTags.mutateAsync({
              ingredientId: ingredient.id,
              tags: tags.map((t) => ({ tagId: t.tagId, relevance: t.relevance })),
            }),
          ])
          setConflict(null)
          setUpdatedAtOverride(null)
          onSuccess(updated.slug)
        }
      } catch (err: unknown) {
        if (isHttpError(err, 409) && mode === 'edit') {
          // someone else saved while we were editing
          // so save the user's current work as a draft
          const draft = { ...form }

          //  fetch the fresh version from the server
          const fresh = (await qc.fetchQuery({
            ...ingredientQueries.bySlug(ingredient.slug),
            staleTime: 0,
          })) as BaseIngredient
          // replace the form with the server version
          setForm({
            name: fresh.name ?? '',
            slug: fresh.slug ?? '',
            category: fresh.category ?? '',
            description: fresh.description ?? '',
            content: fresh.content ?? '',
          })

          //  store the draft + fresh updatedAt so user can recover their work
          setConflict({ draft, freshUpdatedAt: fresh.updatedAt })
          setUpdatedAtOverride(fresh.updatedAt)
          setError(null)
        } else {
          setError(
            err instanceof Error ? err.message : 'Une erreur est survenue lors de la sauvegarde.'
          )
        }
      }
    },
    [
      form,
      isAdmin,
      mode,
      ingredient,
      tags,
      updatedAtOverride,
      createIngredient,
      updateIngredient,
      updateTags,
      onSuccess,
      qc,
    ]
  )

  // restore a single field from the draft back into the form
  const restoreField = useCallback((field: FormFieldKey) => {
    setConflict((prev) => {
      if (!prev) return null
      setForm((f) => ({ ...f, [field]: prev.draft[field] }))
      return prev
    })
  }, [])

  const dismissConflict = useCallback(() => {
    setConflict(null)
  }, [])

  // check if a field differs between the draft and the current form (server version)
  const hasFieldConflict = (field: FormFieldKey): boolean => {
    if (!conflict) return false
    return conflict.draft[field] !== form[field]
  }

  return (
    <form className="ingredient-edit-form" onSubmit={handleSubmit}>
      {error && <div className="ingredient-edit-form__error">{error}</div>}

      {conflict && (
        <div className="ingredient-edit-form__conflict-banner">
          <div className="ingredient-edit-form__conflict-banner-header">
            <AlertTriangle size={16} />
            <span>
              <strong>Conflit détecté</strong> — quelqu'un a modifié cet ingrédient pendant ton
              édition. Le formulaire affiche maintenant la version à jour. Ton brouillon est affiché
              sous chaque champ modifié.
            </span>
          </div>
          <button
            type="button"
            className="ingredient-edit-form__conflict-dismiss"
            onClick={dismissConflict}
          >
            <XIcon size={14} />
            Fermer les brouillons
          </button>
        </div>
      )}

      <FormField label="Nom" htmlFor="ingredient-name" required>
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
        {hasFieldConflict('name') && (
          <DraftHint field="name" value={conflict?.draft.name ?? ''} onRestore={restoreField} />
        )}
      </FormField>

      {isAdmin && (
        <FormField label="Slug" htmlFor="ingredient-slug" hint="Lien URL unique (admin uniquement)">
          <input
            id="ingredient-slug"
            className="ingredient-edit-form__input"
            type="text"
            value={form.slug}
            onChange={handleChange('slug')}
            placeholder="Ex: mon-ingredient-slug"
          />
          {hasFieldConflict('slug') && (
            <DraftHint field="slug" value={conflict?.draft.slug ?? ''} onRestore={restoreField} />
          )}
        </FormField>
      )}

      <FormField label="Catégorie" htmlFor="ingredient-category">
        <input
          id="ingredient-category"
          className="ingredient-edit-form__input"
          type="text"
          value={form.category}
          onChange={handleChange('category')}
          placeholder="Ex : Actif, Émollient, Conservateur…"
        />
        {hasFieldConflict('category') && (
          <DraftHint
            field="category"
            value={conflict?.draft.category ?? ''}
            onRestore={restoreField}
          />
        )}
      </FormField>

      <FormField label="Tags" htmlFor="tags">
        <TagManager
          tags={tags}
          availableTags={availableTags}
          onAddTag={addTag}
          onRemoveTag={removeTag}
          onUpdateRelevance={updateRelevance}
        />
      </FormField>

      <FormField label="Description" htmlFor="ingredient-description" hint="Markdown supporté">
        <textarea
          id="ingredient-description"
          className="ingredient-edit-form__textarea"
          value={form.description}
          onChange={handleChange('description')}
          placeholder="Description de l'ingrédient (Markdown supporté)"
          rows={5}
        />
        {hasFieldConflict('description') && (
          <DraftHint
            field="description"
            value={conflict?.draft.description ?? ''}
            onRestore={restoreField}
          />
        )}
      </FormField>

      <FormField label="Contenu" htmlFor="ingredient-content" hint="Markdown supporté">
        <textarea
          id="ingredient-content"
          className="ingredient-edit-form__textarea"
          value={form.content}
          onChange={handleChange('content')}
          placeholder="Contenu détaillé (Markdown supporté)"
          rows={8}
        />
        {hasFieldConflict('content') && (
          <DraftHint
            field="content"
            value={conflict?.draft.content ?? ''}
            onRestore={restoreField}
          />
        )}
      </FormField>

      <div className="ingredient-edit-form__actions">
        {mode === 'edit' ? (
          <Button to="/ingredients/$slug" params={{ slug: ingredient?.slug }} variant="outline">
            <XIcon size={16} />
            Annuler
          </Button>
        ) : (
          <Button to="/ingredients" variant="outline">
            <XIcon size={16} />
            Annuler
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={isSubmitDisabled} loading={isPending}>
          {!isPending && <Save size={16} />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

// small read-only block that shows the user's draft value for one field
// with a button to restore it into the form
function DraftHint({
  field,
  value,
  onRestore,
}: {
  field: FormFieldKey
  value: string
  onRestore: (field: FormFieldKey) => void
}) {
  return (
    <div className="draft-hint">
      <div className="draft-hint__header">
        <span className="draft-hint__label">Ton brouillon ({FIELD_LABELS[field]})</span>
        <button type="button" className="draft-hint__restore" onClick={() => onRestore(field)}>
          <ClipboardCopy size={12} />
          Restaurer
        </button>
      </div>
      <pre className="draft-hint__value">{value || '(vide)'}</pre>
    </div>
  )
}
