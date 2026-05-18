import type { IngredientType } from '@habit-tracker/shared'
import { INGREDIENT_TYPE_LABELS, INGREDIENT_TYPE_VALUES } from '@habit-tracker/shared'

import { useQuery } from '@tanstack/react-query'
import { Save, X as XIcon } from 'lucide-react'
import { useCallback, useState } from 'react'

import { Button } from '@/component/Button/Button'
import { FormMessage } from '@/component/Feedback/ui/FormMessage/FormMessage'
import { ChipGroup } from '@/component/Input/ChipGroup/ChipGroup'
import { FormField } from '@/component/Input/FormField/FormField'
import { TagManager } from '@/component/Input/TagManager/TagManager'
import {
  type BaseIngredient,
  type IngredientFormData,
  type IngredientFormFieldKey,
  useIngredientFormSubmit,
} from '@/features/ingredients/hooks/useIngredientFormSubmit'
import { type TagState, useFormTags } from '@/hooks/useFormTags'
import { productTagQueries } from '@/lib/queries/product-tags'
import { useAuthStore } from '@/store/auth'
import { ConflictBanner } from './ConflictBanner'
import { IngredientInputField, IngredientTextareaField } from './fields'
import '../IngredientPageEditable.css'

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
  const { data: allTags } = useQuery(productTagQueries.list())
  const { isAdmin } = useAuthStore()

  const [form, setForm] = useState<IngredientFormData>({
    name: ingredient?.name ?? '',
    slug: ingredient?.slug ?? '',
    category: ingredient?.category ?? '',
    description: ingredient?.description ?? '',
    content: ingredient?.content ?? '',
  })
  const [ingredientType, setIngredientType] = useState<IngredientType>(
    ingredient?.type ?? 'skincare'
  )

  const { tags, addTag, removeTag, updateRelevance, availableTags, isTagsDirty } = useFormTags({
    initialTags,
    allTags,
  })

  const submitArgs =
    mode === 'edit'
      ? ({ mode: 'edit' as const, ingredient } as const)
      : ({ mode: 'create' as const } as const)
  const {
    handleSubmit,
    error,
    fieldError,
    conflict,
    dismissConflict,
    restoreField,
    clearError,
    isPending,
    submitLabel,
  } = useIngredientFormSubmit({
    ...submitArgs,
    form,
    setForm,
    ingredientType,
    tags,
    isAdmin,
    onSuccess,
  })

  const handleChange = useCallback(
    (field: IngredientFormFieldKey) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }))
        clearError()
      },
    [clearError]
  )

  const handleTypeChange = useCallback((vals: IngredientType[]) => {
    if (vals[0]) setIngredientType(vals[0])
  }, [])

  const isDirty = computeIsDirty({ form, ingredient, ingredientType, isTagsDirty })
  const isSubmitDisabled = computeSubmitDisabled({ mode, form, isDirty, isPending })

  return (
    <form className="ingredient-edit-form" onSubmit={handleSubmit}>
      <FormError error={error} fieldError={fieldError} />
      <ConflictBanner conflict={conflict} onDismiss={dismissConflict} />

      <FormField label="Type">
        <ChipGroup
          options={INGREDIENT_TYPE_VALUES.map((v) => ({
            value: v,
            label: INGREDIENT_TYPE_LABELS[v],
          }))}
          selected={[ingredientType]}
          onChange={handleTypeChange}
          mode="exclusive"
          aria-label="Type d'ingrédient"
        />
      </FormField>

      <IngredientInputField
        label="Nom"
        id="ingredient-name"
        value={form.name}
        onChange={handleChange('name')}
        placeholder="Nom de l'ingrédient"
        required
        autoFocus
        fieldError={fieldError?.field === 'name' ? fieldError.message : undefined}
        fieldKey="name"
        conflict={conflict}
        onRestoreField={restoreField}
      />

      {isAdmin && (
        <IngredientInputField
          label="Slug"
          id="ingredient-slug"
          value={form.slug}
          onChange={handleChange('slug')}
          placeholder="Ex: mon-ingredient-slug"
          hint="Lien URL unique (admin uniquement)"
          fieldError={fieldError?.field === 'slug' ? fieldError.message : undefined}
          fieldKey="slug"
          conflict={conflict}
          onRestoreField={restoreField}
        />
      )}

      <IngredientInputField
        label="Catégorie"
        id="ingredient-category"
        value={form.category}
        onChange={handleChange('category')}
        placeholder="Ex : Actif, Émollient, Conservateur…"
        fieldKey="category"
        conflict={conflict}
        onRestoreField={restoreField}
      />

      <FormField label="Tags">
        <TagManager
          tags={tags}
          availableTags={availableTags}
          onAddTag={addTag}
          onRemoveTag={removeTag}
          onUpdateRelevance={updateRelevance}
        />
      </FormField>

      <IngredientTextareaField
        label="Description"
        id="ingredient-description"
        value={form.description}
        onChange={handleChange('description')}
        placeholder="Description de l'ingrédient (Markdown supporté)"
        hint="Markdown supporté"
        rows={5}
        fieldKey="description"
        conflict={conflict}
        onRestoreField={restoreField}
      />

      <IngredientTextareaField
        label="Contenu"
        id="ingredient-content"
        value={form.content}
        onChange={handleChange('content')}
        placeholder="Contenu détaillé (Markdown supporté)"
        hint="Markdown supporté"
        rows={8}
        fieldKey="content"
        conflict={conflict}
        onRestoreField={restoreField}
      />

      <IngredientFormActions
        mode={mode}
        ingredientSlug={ingredient?.slug}
        submitLabel={submitLabel}
        disabled={isSubmitDisabled}
        isPending={isPending}
      />
    </form>
  )
}

function FormError({
  error,
  fieldError,
}: {
  error: string | null
  fieldError: { field: unknown; message: string } | null
}) {
  if (!error || fieldError) return null
  return <FormMessage variant="error">{error}</FormMessage>
}

function IngredientFormActions({
  mode,
  ingredientSlug,
  submitLabel,
  disabled,
  isPending,
}: {
  mode: 'create' | 'edit'
  ingredientSlug: string | undefined
  submitLabel: string
  disabled: boolean
  isPending: boolean
}) {
  return (
    <div className="ingredient-edit-form__actions">
      {mode === 'edit' ? (
        <Button to="/ingredients/$slug" params={{ slug: ingredientSlug }} variant="outline">
          <XIcon size={16} />
          Annuler
        </Button>
      ) : (
        <Button to="/ingredients" variant="outline">
          <XIcon size={16} />
          Annuler
        </Button>
      )}
      <Button type="submit" variant="primary" disabled={disabled} loading={isPending}>
        {!isPending && <Save size={16} />}
        {submitLabel}
      </Button>
    </div>
  )
}

function computeSubmitDisabled({
  mode,
  form,
  isDirty,
  isPending,
}: {
  mode: 'create' | 'edit'
  form: IngredientFormData
  isDirty: boolean
  isPending: boolean
}): boolean {
  if (isPending) return true
  if (mode === 'create') return !form.name.trim()
  return !isDirty
}

function computeIsDirty({
  form,
  ingredient,
  ingredientType,
  isTagsDirty,
}: {
  form: IngredientFormData
  ingredient: BaseIngredient | undefined
  ingredientType: IngredientType
  isTagsDirty: boolean
}): boolean {
  if (isTagsDirty) return true
  return (
    form.name !== (ingredient?.name ?? '') ||
    form.slug !== (ingredient?.slug ?? '') ||
    form.category !== (ingredient?.category ?? '') ||
    form.description !== (ingredient?.description ?? '') ||
    form.content !== (ingredient?.content ?? '') ||
    ingredientType !== (ingredient?.type ?? 'skincare')
  )
}
