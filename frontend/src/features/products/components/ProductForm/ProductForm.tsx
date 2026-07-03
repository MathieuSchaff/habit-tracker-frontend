import type { ProductCategory, ProductConcentrationUnit } from '@aurore/shared'
import {
  getProductTagCategory,
  PRODUCT_AMOUNT_UNIT_LABELS,
  PRODUCT_AMOUNT_UNITS,
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_CATEGORY_TO_DOMAIN_TAB,
  PRODUCT_CATEGORY_VALUES,
  PRODUCT_KIND_LABELS,
  PRODUCT_KINDS,
  PRODUCT_UNIT_LABELS,
  PRODUCT_UNITS,
} from '@aurore/shared'

import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'

import { Button, ButtonLink } from '@/component/Button/Button'
import { FormError } from '@/component/Feedback/ui/FormError/FormError'
import { ChipGroup } from '@/component/Input/ChipGroup/ChipGroup'
import { FormField } from '@/component/Input/FormField/FormField'
import { Input } from '@/component/Input/Input'
import { Select } from '@/component/Input/Select/Select'
import { TagManager } from '@/component/Input/TagManager/TagManager'
import { Textarea } from '@/component/Input/Textarea/Textarea'
import { BrandCombobox } from '@/features/products/components/BrandCombobox/BrandCombobox'
import { FormulaPreview } from '@/features/products/components/FormulaPreview/FormulaPreview'
import { ProductImageField } from '@/features/products/components/ProductForm/ProductImageField'
import { useProductFormSubmit } from '@/features/products/hooks/useProductFormSubmit'
import { useDebounce } from '@/hooks/useDebounce'
import { type TagRelevance, type TagState, useFormTags } from '@/hooks/useFormTags'
import { productTagQueries } from '@/lib/queries/product-tags'
import {
  type ProductDetail,
  productQueries,
  useAddProductIngredient,
  useRemoveProductIngredient,
  useUpdateProductIngredient,
} from '@/lib/queries/products'
import './ProductForm.css'

import { DuplicateWarning } from './DuplicateWarning'
import { type IngredientItem, IngredientsFieldset } from './IngredientsFieldset'
import {
  emptyProductEditForm,
  type ProductEditFormInput,
  productToEditForm,
} from './ProductForm.schema'
import { SlugEditModal } from './SlugEditModal'
import { TextureField } from './TextureField'

type PendingIngredient = IngredientItem

const EMPTY_TAGS: TagState[] = []

type ProductFormProps =
  | {
      mode: 'create'
      product?: never
      initialTags?: never
      // Resubmit-after-hide seeds the identifying pair so the author doesn't retype it.
      prefill?: { name?: string; brand?: string }
      onSuccess: (slug: string) => void
    }
  | {
      mode: 'edit'
      product: ProductDetail
      initialTags?: TagState[]
      prefill?: never
      onSuccess: (slug: string) => void
    }

export function ProductForm({
  mode,
  product,
  initialTags = EMPTY_TAGS,
  prefill,
  onSuccess,
}: ProductFormProps) {
  const { data: allTags } = useQuery(productTagQueries.list())
  const addIngredient = useAddProductIngredient()
  const removeIngredient = useRemoveProductIngredient()
  const updateIngredient = useUpdateProductIngredient()

  const initialForm = useMemo<ProductEditFormInput>(
    () =>
      mode === 'edit'
        ? productToEditForm(product)
        : { ...emptyProductEditForm(), name: prefill?.name ?? '', brand: prefill?.brand ?? '' },
    [mode, product, prefill?.name, prefill?.brand]
  )
  const [form, setForm] = useState<ProductEditFormInput>(initialForm)

  const domain = PRODUCT_CATEGORY_TO_DOMAIN_TAB[form.category]

  const domainTags = useMemo(
    () => allTags?.filter((t) => getProductTagCategory(t.slug, domain) !== undefined),
    [allTags, domain]
  )

  const { tags, setTags, addTag, removeTag, updateRelevance, availableTags, isTagsDirty } =
    useFormTags({
      initialTags,
      allTags: domainTags,
    })

  // A prefilled brand came from an existing fiche, so treat it as confirmed (no extra click).
  const [brandConfirmed, setBrandConfirmed] = useState(mode === 'edit' || !!prefill?.brand)
  const [pendingIngredients, setPendingIngredients] = useState<PendingIngredient[]>([])
  const [slugModalOpen, setSlugModalOpen] = useState(false)

  const debouncedName = useDebounce(form.name.trim())
  const debouncedBrand = useDebounce(form.brand.trim())

  const { data: similarProducts } = useQuery({
    ...productQueries.checkDuplicate(debouncedName, debouncedBrand),
    enabled: mode === 'create' && debouncedName.length >= 2 && debouncedBrand.length >= 1,
  })

  const { data: previewSlugData } = useQuery({
    ...productQueries.previewSlug(debouncedName, debouncedBrand),
    enabled: mode === 'create' && debouncedName.length >= 2 && debouncedBrand.length >= 1,
  })
  const previewSlug = mode === 'create' ? (previewSlugData ?? null) : null

  const submitArgs =
    mode === 'edit'
      ? ({ mode: 'edit' as const, product, form, tags, onSuccess } as const)
      : ({
          mode: 'create' as const,
          form,
          tags,
          pendingIngredients,
          onSuccess,
        } as const)
  const { handleSubmit, error, fieldError, clearError, isPending, submitLabel } =
    useProductFormSubmit(submitArgs)

  const handleChange = useCallback(
    (field: keyof typeof form) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }))
        clearError()
      },
    [clearError]
  )

  const setKind = useCallback(
    ([v]: string[]) => setForm((prev) => ({ ...prev, kind: v ?? '' })),
    []
  )
  const setUnit = useCallback(
    ([v]: string[]) => setForm((prev) => ({ ...prev, unit: v ?? '' })),
    []
  )
  const setAmountUnit = useCallback(
    (v: string) => setForm((prev) => ({ ...prev, amountUnit: v })),
    []
  )
  const setTexture = useCallback(
    (next: string) => setForm((prev) => ({ ...prev, texture: next })),
    []
  )
  const handleBrandChange = useCallback((v: string, confirmed: boolean) => {
    setForm((prev) => ({ ...prev, brand: v }))
    setBrandConfirmed(confirmed)
  }, [])
  const handleImageUpload = useCallback(
    (url: string) => setForm((prev) => ({ ...prev, imageUrl: url })),
    []
  )
  const openSlugModal = useCallback(() => setSlugModalOpen(true), [])
  const closeSlugModal = useCallback(() => setSlugModalOpen(false), [])
  const confirmSlug = useCallback((next: string) => {
    setForm((prev) => ({ ...prev, slug: next }))
    setSlugModalOpen(false)
  }, [])

  const isFormDirty = useMemo(
    () =>
      (Object.keys(form) as Array<keyof ProductEditFormInput>).some(
        (k) => form[k] !== initialForm[k]
      ),
    [form, initialForm]
  )
  const isDirty = isFormDirty || isTagsDirty

  const isSubmitDisabled = computeIsSubmitDisabled({
    mode,
    form,
    brandConfirmed,
    isDirty,
    isPending,
  })

  // Edit mode coerces DB nulls to '' so IngredientRow only sees strings; persistence re-coerces.
  const ingredientItems = useMemo<IngredientItem[]>(() => {
    if (mode === 'edit') {
      return product.ingredients.map((i) => ({
        ingredientId: i.ingredientId,
        ingredientName: i.ingredientName,
        concentrationValue: i.concentrationValue ?? '',
        concentrationUnit: (i.concentrationUnit ?? '') as ProductConcentrationUnit | '',
      }))
    }
    return pendingIngredients
  }, [mode, product, pendingIngredients])

  const handleCategoryChange = useCallback(
    ([v]: string[]) => {
      if (!v) return
      const next = v as ProductCategory
      setForm((prev) => ({
        ...prev,
        category: next,
        kind: '',
        unit: '',
        amountUnit: '',
        texture: '',
      }))
      const nextDomain = PRODUCT_CATEGORY_TO_DOMAIN_TAB[next]
      setTags((prev) =>
        prev.filter((t) => {
          const meta = allTags?.find((at) => at.id === t.tagId)
          return meta?.slug != null && getProductTagCategory(meta.slug, nextDomain) !== undefined
        })
      )
    },
    [allTags, setTags]
  )

  const handleIngredientPersist = useCallback(
    (
      ingredientId: string,
      { value, unit }: { value: string; unit: ProductConcentrationUnit | '' }
    ) => {
      if (mode === 'edit') {
        const trimmed = value.trim()
        const parsed = trimmed === '' ? null : parseFloat(trimmed)
        if (parsed !== null && Number.isNaN(parsed)) return
        updateIngredient.mutate({
          productId: product.id,
          slug: product.slug,
          ingredientId,
          concentrationValue: parsed,
          concentrationUnit: unit === '' ? null : unit,
        })
        return
      }
      setPendingIngredients((prev) =>
        prev.map((p) =>
          p.ingredientId === ingredientId
            ? { ...p, concentrationValue: value, concentrationUnit: unit }
            : p
        )
      )
    },
    [mode, product, updateIngredient]
  )

  const handleRemoveIngredient = useCallback(
    (ingredientId: string) => {
      if (mode === 'edit') {
        removeIngredient.mutate({ productId: product.id, slug: product.slug, ingredientId })
        return
      }
      setPendingIngredients((prev) => prev.filter((i) => i.ingredientId !== ingredientId))
    },
    [mode, product, removeIngredient]
  )

  const handleAddIngredient = useCallback(
    (ingredientId: string, ingredientName: string) => {
      if (mode === 'edit') {
        addIngredient.mutate({ productId: product.id, slug: product.slug, ingredientId })
        return
      }
      setPendingIngredients((prev) => [
        ...prev,
        { ingredientId, ingredientName, concentrationValue: '', concentrationUnit: '' },
      ])
    },
    [mode, product, addIngredient]
  )

  // addTag defaults to 'secondary'; bump only when the suggestion says otherwise.
  const handleApplyTag = useCallback(
    (tagId: string, relevance: TagRelevance) => {
      addTag(tagId)
      if (relevance !== 'secondary') updateRelevance(tagId, relevance)
    },
    [addTag, updateRelevance]
  )

  const removingIngredientId =
    mode === 'edit' && removeIngredient.isPending
      ? removeIngredient.variables?.ingredientId
      : undefined
  const isUpdatingIngredient = mode === 'edit' && updateIngredient.isPending
  const formAriaLabel = computeFormAriaLabel(mode, product)

  return (
    <form className="product-edit-form" onSubmit={handleSubmit} aria-label={formAriaLabel}>
      <FormError error={error} fieldError={fieldError} />
      <DuplicateWarning mode={mode} products={similarProducts} />

      <FormField label="Domaine" required>
        <ChipGroup
          options={PRODUCT_CATEGORY_VALUES.map((v) => ({
            value: v,
            label: PRODUCT_CATEGORY_LABELS[v],
          }))}
          selected={[form.category]}
          onChange={handleCategoryChange}
          mode="exclusive"
          aria-label="Domaine du produit"
        />
      </FormField>

      <div className="product-edit-form__row">
        <Input
          label="Nom"
          id="edit-name"
          required
          value={form.name}
          onChange={handleChange('name')}
          placeholder="Nom du produit"
          autoFocus
          error={fieldError?.field === 'name' ? fieldError.message : undefined}
        />

        <FormField label="Marque" htmlFor="product-form-brand" required>
          <BrandCombobox id="product-form-brand" value={form.brand} onChange={handleBrandChange} />
        </FormField>
      </div>

      <ProductSlugSection mode={mode} slug={form.slug} onEdit={openSlugModal} />

      <FormField label="Type de produit" required>
        <ChipGroup
          options={Object.values(PRODUCT_KINDS[form.category] ?? {}).map((v) => ({
            value: v as string,
            label: PRODUCT_KIND_LABELS[v as keyof typeof PRODUCT_KIND_LABELS] ?? (v as string),
          }))}
          selected={form.kind ? [form.kind] : []}
          onChange={setKind}
          mode="exclusive"
          aria-label="Type de produit"
        />
      </FormField>

      <TextureField category={form.category} value={form.texture} onChange={setTexture} />

      <FormField label="Conditionnement" required>
        <ChipGroup
          options={Object.values(PRODUCT_UNITS[form.category] ?? {}).map((v) => ({
            value: v as string,
            label: PRODUCT_UNIT_LABELS[v as keyof typeof PRODUCT_UNIT_LABELS] ?? (v as string),
          }))}
          selected={form.unit ? [form.unit] : []}
          onChange={setUnit}
          mode="exclusive"
          aria-label="Conditionnement du produit"
        />
      </FormField>

      <div className="product-edit-form__row">
        <fieldset className="form-field">
          <legend className="form-field__label">Contenance</legend>
          <div className="product-edit-form__inline">
            <Input
              id="edit-total-amount"
              type="number"
              min={1}
              value={form.totalAmount}
              onChange={handleChange('totalAmount')}
              placeholder="Ex : 30"
              aria-label="Quantité"
            />
            <Select
              id="edit-amount-unit"
              className="product-edit-form__amount-unit"
              value={form.amountUnit}
              onValueChange={setAmountUnit}
              aria-label="Unité de contenance"
              placeholder="—"
              options={PRODUCT_AMOUNT_UNITS[form.category].map((v) => ({
                value: v,
                label: PRODUCT_AMOUNT_UNIT_LABELS[v],
              }))}
            />
          </div>
        </fieldset>

        <Input
          label="Prix (€)"
          id="edit-price"
          type="number"
          min={0}
          step={0.01}
          value={form.priceEuros}
          onChange={handleChange('priceEuros')}
          placeholder="Ex : 12.90"
        />
      </div>

      <div className="product-edit-form__row">
        <Input
          label="Lien produit"
          id="edit-url"
          type="url"
          value={form.url}
          onChange={handleChange('url')}
          placeholder="https://…"
        />
        <ProductImageSection
          mode={mode}
          product={product}
          form={form}
          previewSlug={previewSlug}
          onUpload={handleImageUpload}
        />
      </div>

      <Textarea
        label="INCI"
        id="edit-inci"
        hint="Collez la liste complète, puis lancez l'analyse pour la relier au catalogue."
        value={form.inci}
        onChange={handleChange('inci')}
        placeholder="Liste INCI des ingrédients…"
        rows={4}
      />

      <FormulaPreview
        inci={form.inci}
        category={form.category}
        kind={form.kind}
        name={form.name}
        brand={form.brand}
        texture={form.texture}
        description={form.description}
        allTags={domainTags}
        selectedTagIds={tags.map((t) => t.tagId)}
        linkedIngredientIds={ingredientItems.map((i) => i.ingredientId)}
        onApplyTag={handleApplyTag}
        onAddIngredient={handleAddIngredient}
      />

      <Textarea
        label="Description"
        id="edit-description"
        hint="Markdown supporté"
        value={form.description}
        onChange={handleChange('description')}
        placeholder="Description du produit (Markdown supporté)"
        rows={5}
      />

      <Textarea
        label="Notes"
        id="edit-notes"
        value={form.notes}
        onChange={handleChange('notes')}
        placeholder="Notes personnelles sur ce produit…"
        rows={4}
      />

      <fieldset className="form-field">
        <legend className="form-field__label">Tags</legend>
        <TagManager
          tags={tags}
          availableTags={availableTags}
          onAddTag={addTag}
          onRemoveTag={removeTag}
          onUpdateRelevance={updateRelevance}
        />
      </fieldset>

      <IngredientsFieldset
        mode={mode}
        items={ingredientItems}
        onPersist={handleIngredientPersist}
        onRemove={handleRemoveIngredient}
        onAdd={handleAddIngredient}
        removingIngredientId={removingIngredientId}
        isUpdating={isUpdatingIngredient}
      />

      <ProductFormActions
        mode={mode}
        productSlug={product?.slug}
        submitLabel={submitLabel}
        disabled={isSubmitDisabled}
        isPending={isPending}
      />

      <SlugEditModalGate
        open={slugModalOpen}
        mode={mode}
        slug={form.slug}
        name={form.name}
        onClose={closeSlugModal}
        onConfirm={confirmSlug}
      />
    </form>
  )
}

function SlugEditModalGate({
  open,
  mode,
  slug,
  name,
  onClose,
  onConfirm,
}: {
  open: boolean
  mode: 'create' | 'edit'
  slug: string
  name: string
  onClose: () => void
  onConfirm: (next: string) => void
}) {
  if (!open || mode !== 'edit') return null
  return (
    <SlugEditModal currentSlug={slug} productName={name} onClose={onClose} onConfirm={onConfirm} />
  )
}

function ProductSlugSection({
  mode,
  slug,
  onEdit,
}: {
  mode: 'create' | 'edit'
  slug: string
  onEdit: () => void
}) {
  if (mode !== 'edit') return null
  return (
    <div className="product-edit-form__slug">
      <span className="product-edit-form__slug-label">URL :</span>
      <code className="product-edit-form__slug-value">/products/{slug}</code>
      <Button type="button" variant="outline" size="sm" onClick={onEdit}>
        Modifier le slug
      </Button>
    </div>
  )
}

function ProductImageSection({
  mode,
  product,
  form,
  previewSlug,
  onUpload,
}: {
  mode: 'create' | 'edit'
  product: ProductDetail | undefined
  form: ProductEditFormInput
  previewSlug: string | null
  onUpload: (url: string) => void
}) {
  if (mode === 'create' || !product) {
    return (
      <ProductImageField
        mode="create"
        endpoint={previewSlug ? `/api/uploads/product/${previewSlug}` : null}
        imageUrl={form.imageUrl}
        onUpload={onUpload}
      />
    )
  }
  return (
    <ProductImageField
      mode="edit"
      productSlug={product.slug}
      productName={product.name ?? ''}
      imageUrl={form.imageUrl}
      altName={form.name || product.name || 'produit'}
      onUpload={onUpload}
    />
  )
}

function ProductFormActions({
  mode,
  productSlug,
  submitLabel,
  disabled,
  isPending,
}: {
  mode: 'create' | 'edit'
  productSlug: string | undefined
  submitLabel: string
  disabled: boolean
  isPending: boolean
}) {
  return (
    <div className="product-edit-form__actions">
      {mode === 'edit' && productSlug ? (
        <ButtonLink to="/products/$slug" params={{ slug: productSlug }} variant="outline">
          Annuler
        </ButtonLink>
      ) : (
        <ButtonLink to="/products" variant="outline">
          Annuler
        </ButtonLink>
      )}
      <Button type="submit" variant="primary" disabled={disabled} loading={isPending}>
        {submitLabel}
      </Button>
    </div>
  )
}

function computeFormAriaLabel(mode: 'create' | 'edit', product: ProductDetail | undefined): string {
  if (mode === 'create') return 'Créer un produit'
  return `Modifier ${product?.name ?? 'le produit'}`
}

function computeIsSubmitDisabled({
  mode,
  form,
  brandConfirmed,
  isDirty,
  isPending,
}: {
  mode: 'create' | 'edit'
  form: ProductEditFormInput
  brandConfirmed: boolean
  isDirty: boolean
  isPending: boolean
}): boolean {
  if (isPending) return true
  if (mode === 'edit') return !isDirty
  return (
    !form.name.trim() ||
    !form.brand.trim() ||
    !brandConfirmed ||
    !form.kind.trim() ||
    !form.unit.trim()
  )
}
