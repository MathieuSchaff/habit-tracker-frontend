import type { IngredientType } from '@habit-tracker/shared'

import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import {
  INGREDIENT_FORM_ERRORS,
  type IngredientFormField,
} from '@/features/ingredients/components/IngredientForm/formErrors'
import { extractFormError } from '@/lib/helpers/apiError'
import { isHttpError } from '@/lib/helpers/isHttpError'
import {
  ingredientQueries,
  useCreateIngredient,
  useUpdateIngredient,
  useUpdateIngredientTags,
} from '@/lib/queries/ingredients'

export type IngredientFormData = {
  name: string
  slug: string
  category: string
  description: string
  content: string
}

export type IngredientFormFieldKey = keyof IngredientFormData

export type BaseIngredient = {
  id: string
  slug: string
  name: string | null
  type: IngredientType
  category: string | null
  description: string | null
  content: string | null
  updatedAt: string
}

type TagPayload = { tagId: string; relevance: 'primary' | 'secondary' | 'avoid' }

type ConflictState = {
  draft: IngredientFormData
  freshUpdatedAt: string
}

type CreateArgs = {
  mode: 'create'
  ingredient?: never
}

type EditArgs = {
  mode: 'edit'
  ingredient: BaseIngredient
}

type Args = (CreateArgs | EditArgs) & {
  form: IngredientFormData
  setForm: React.Dispatch<React.SetStateAction<IngredientFormData>>
  ingredientType: IngredientType
  tags: Array<{ tagId: string; relevance: TagPayload['relevance'] }>
  isAdmin: boolean
  onSuccess: (slug: string) => void
}

export function useIngredientFormSubmit(args: Args) {
  const qc = useQueryClient()
  const createIngredient = useCreateIngredient()
  const updateIngredient = useUpdateIngredient()
  const updateTags = useUpdateIngredientTags()

  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<{
    field: IngredientFormField
    message: string
  } | null>(null)
  const [conflict, setConflict] = useState<ConflictState | null>(null)
  // Next save uses the fresh updatedAt so the optimistic lock doesn't trip again.
  const [updatedAtOverride, setUpdatedAtOverride] = useState<string | null>(null)

  const tagsPayload = () => args.tags.map((t) => ({ tagId: t.tagId, relevance: t.relevance }))

  function trimmedField(value: string): string | undefined {
    const trimmed = value.trim()
    return trimmed || undefined
  }

  async function submitCreate(): Promise<string> {
    const created = await createIngredient.mutateAsync({
      name: args.form.name.trim(),
      type: args.ingredientType,
      slug: args.isAdmin ? trimmedField(args.form.slug) : undefined,
      category: trimmedField(args.form.category),
      description: trimmedField(args.form.description),
      content: trimmedField(args.form.content),
    })
    if (args.tags.length > 0) {
      await updateTags.mutateAsync({ ingredientId: created.id, tags: tagsPayload() })
    }
    return created.slug
  }

  async function submitEdit(ingredient: BaseIngredient): Promise<string> {
    const [updated] = await Promise.all([
      updateIngredient.mutateAsync({
        id: ingredient.id,
        data: {
          name: args.form.name.trim(),
          slug: args.isAdmin ? trimmedField(args.form.slug) : undefined,
          category: trimmedField(args.form.category),
          description: trimmedField(args.form.description),
          content: trimmedField(args.form.content),
          expectedUpdatedAt: updatedAtOverride ?? ingredient.updatedAt,
        },
      }),
      updateTags.mutateAsync({ ingredientId: ingredient.id, tags: tagsPayload() }),
    ])
    setConflict(null)
    setUpdatedAtOverride(null)
    return updated.slug
  }

  async function handleConflict(ingredient: BaseIngredient) {
    const draft = { ...args.form }
    const fresh = (await qc.fetchQuery({
      ...ingredientQueries.bySlug(ingredient.slug),
      staleTime: 0,
    })) as BaseIngredient
    args.setForm({
      name: fresh.name ?? '',
      slug: fresh.slug ?? '',
      category: fresh.category ?? '',
      description: fresh.description ?? '',
      content: fresh.content ?? '',
    })
    setConflict({ draft, freshUpdatedAt: fresh.updatedAt })
    setUpdatedAtOverride(fresh.updatedAt)
    setError(null)
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!args.form.name.trim()) {
      setError("Le nom de l'ingrédient est obligatoire.")
      return
    }

    try {
      const slug = args.mode === 'create' ? await submitCreate() : await submitEdit(args.ingredient)
      args.onSuccess(slug)
    } catch (err) {
      if (isHttpError(err, 409) && args.mode === 'edit') {
        await handleConflict(args.ingredient)
        return
      }
      const { field, message } = extractFormError(err, INGREDIENT_FORM_ERRORS)
      setError(message)
      setFieldError(field ? { field, message } : null)
    }
  }

  function restoreField(field: IngredientFormFieldKey) {
    const current = conflict
    if (!current) return
    args.setForm((f) => ({ ...f, [field]: current.draft[field] }))
  }

  const isPending = createIngredient.isPending || updateIngredient.isPending || updateTags.isPending

  const submitLabel =
    args.mode === 'create'
      ? createIngredient.isPending
        ? 'Création…'
        : "Créer l'ingrédient"
      : updateIngredient.isPending || updateTags.isPending
        ? 'Enregistrement…'
        : 'Enregistrer'

  return {
    handleSubmit,
    error,
    fieldError,
    conflict,
    dismissConflict: () => setConflict(null),
    restoreField,
    clearError: () => {
      setError(null)
      setFieldError(null)
    },
    isPending,
    submitLabel,
  }
}
