import type { ProductCategory, ProductConcentrationUnit } from '@habit-tracker/shared'
import {
  DOMAIN_PRODUCT_FILTER_CATEGORIES,
  PRODUCT_AMOUNT_UNIT_LABELS,
  PRODUCT_AMOUNT_UNITS,
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_CATEGORY_TO_DOMAIN_TAB,
  PRODUCT_CATEGORY_VALUES,
  PRODUCT_CONCENTRATION_UNIT_LABELS,
  PRODUCT_CONCENTRATION_UNIT_VALUES,
  PRODUCT_KIND_LABELS,
  PRODUCT_KINDS,
  PRODUCT_UNIT_LABELS,
  PRODUCT_UNITS,
} from '@habit-tracker/shared'

import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Button } from '@/component/Button/Button'
import { FormMessage } from '@/component/Feedback/ui/FormMessage/FormMessage'
import { ChipGroup } from '@/component/Input/ChipGroup/ChipGroup'
import { FormField } from '@/component/Input/FormField/FormField'
import { Input } from '@/component/Input/Input'
import { TagManager } from '@/component/Input/TagManager/TagManager'
import { BrandCombobox } from '@/features/products/components/BrandCombobox/BrandCombobox'
import { IngredientSearch } from '@/features/products/components/IngredientSearch/IngredientSearch'
import { type TagState, useFormTags } from '@/hooks/useFormTags'
import {
  productQueries,
  useAddProductIngredient,
  useCreateProduct,
  useRemoveProductIngredient,
  useUpdateProduct,
  useUpdateProductIngredient,
  useUpdateProductTags,
} from '@/lib/queries/products'
import { tagQueries } from '@/lib/queries/tags'
import './ProductForm.css'

import {
  emptyProductEditForm,
  type ProductEditFormInput,
  productEditFormSchema,
  productEditFormToCreateInput,
  productEditFormToUpdateInput,
  productToEditForm,
} from './ProductForm.schema'

type ProductWithIngredients = {
  id: string
  slug: string
  name: string | null
  brand: string | null
  category?: string | null
  kind: string | null
  unit: string | null
  priceCents: number | null
  totalAmount: number | null
  amountUnit: string | null
  inci: string | null
  description: string | null
  notes: string | null
  url: string | null
  imageUrl: string | null
  ingredients: Array<{
    ingredientId: string
    ingredientName: string
    concentrationValue: string | null
    concentrationUnit: string | null
  }>
}

type PendingIngredient = {
  ingredientId: string
  ingredientName: string
  concentrationValue: string
  concentrationUnit: ProductConcentrationUnit | ''
}

const CONCENTRATION_UNIT_OPTIONS = PRODUCT_CONCENTRATION_UNIT_VALUES.map((v) => ({
  value: v,
  label: PRODUCT_CONCENTRATION_UNIT_LABELS[v],
}))

type IngredientRowProps = {
  ingredientId: string
  ingredientName: string
  initialValue: string
  initialUnit: ProductConcentrationUnit | ''
  onPersist: (next: { value: string; unit: ProductConcentrationUnit | '' }) => void
  onRemove: () => void
  removing: boolean
  updating: boolean
}

function IngredientRow({
  ingredientName,
  initialValue,
  initialUnit,
  onPersist,
  onRemove,
  removing,
  updating,
}: IngredientRowProps) {
  const [value, setValue] = useState(initialValue)
  const [unit, setUnit] = useState<ProductConcentrationUnit | ''>(initialUnit)

  return (
    <div className="product-edit-ingredient">
      <span className="product-edit-ingredient__name">{ingredientName}</span>
      <div className="product-edit-ingredient__concentration">
        <div className="product-edit-ingredient__value">
          <Input
            type="number"
            min={0}
            step={0.01}
            placeholder="Dose"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
              if (value !== initialValue) onPersist({ value, unit })
            }}
            aria-label={`Concentration de ${ingredientName}`}
            hideRequired
          />
        </div>
        <ChipGroup
          options={CONCENTRATION_UNIT_OPTIONS}
          selected={unit ? [unit] : []}
          onChange={([next]) => {
            const nextUnit = (next ?? '') as ProductConcentrationUnit | ''
            setUnit(nextUnit)
            onPersist({ value, unit: nextUnit })
          }}
          mode="exclusive"
          aria-label={`Unité pour ${ingredientName}`}
        />
      </div>
      <button
        type="button"
        className="product-edit-ingredient__remove"
        aria-label={`Retirer ${ingredientName}`}
        onClick={onRemove}
        disabled={removing || updating}
      >
        <Trash2 size={14} aria-hidden="true" />
      </button>
    </div>
  )
}

type ProductFormProps =
  | {
      mode: 'create'
      product?: never
      initialTags?: never
      onSuccess: (slug: string) => void
    }
  | {
      mode: 'edit'
      product: ProductWithIngredients
      initialTags?: TagState[]
      onSuccess: (slug: string) => void
    }
export function ProductForm({ mode, product, initialTags = [], onSuccess }: ProductFormProps) {
  const { data: allTags } = useQuery(tagQueries.list())
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const updateTags = useUpdateProductTags()
  const addIngredient = useAddProductIngredient()
  const removeIngredient = useRemoveProductIngredient()
  const updateIngredient = useUpdateProductIngredient()

  const initialForm = useMemo<ProductEditFormInput>(
    () => (mode === 'edit' ? productToEditForm(product) : emptyProductEditForm()),
    [mode, product]
  )
  const [form, setForm] = useState<ProductEditFormInput>(initialForm)

  const validTagTypes = useMemo(() => {
    const domain = PRODUCT_CATEGORY_TO_DOMAIN_TAB[form.category]
    return new Set<string>(DOMAIN_PRODUCT_FILTER_CATEGORIES[domain])
  }, [form.category])

  const domainTags = useMemo(
    () => allTags?.filter((t) => t.category != null && validTagTypes.has(t.category)),
    [allTags, validTagTypes]
  )

  const { tags, setTags, addTag, removeTag, updateRelevance, availableTags, isTagsDirty } =
    useFormTags({
      initialTags,
      allTags: domainTags,
    })

  const [brandConfirmed, setBrandConfirmed] = useState(mode === 'edit')
  const [pendingIngredients, setPendingIngredients] = useState<PendingIngredient[]>([])
  const [error, setError] = useState<string | null>(null)

  const [debouncedName, setDebouncedName] = useState('')
  const [debouncedBrand, setDebouncedBrand] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedName(form.name.trim())
      setDebouncedBrand(form.brand.trim())
    }, 400)
    return () => clearTimeout(timer)
  }, [form.name, form.brand])

  const { data: similarProducts } = useQuery({
    ...productQueries.checkDuplicate(debouncedName, debouncedBrand),
    enabled: mode === 'create' && debouncedName.length >= 2 && debouncedBrand.length >= 1,
  })

  const handleChange = useCallback(
    (field: keyof typeof form) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }))
        setError(null)
      },
    []
  )

  const isFormDirty = (Object.keys(form) as Array<keyof ProductEditFormInput>).some(
    (k) => form[k] !== initialForm[k]
  )
  const isDirty = isFormDirty || isTagsDirty

  const isSubmitDisabled =
    mode === 'create'
      ? createProduct.isPending ||
        !form.name.trim() ||
        !form.brand.trim() ||
        !brandConfirmed ||
        !form.kind.trim() ||
        !form.unit.trim()
      : updateProduct.isPending || updateTags.isPending || !isDirty

  const submitLabel =
    mode === 'create'
      ? createProduct.isPending
        ? 'Création…'
        : 'Créer le produit'
      : updateProduct.isPending || updateTags.isPending
        ? 'Enregistrement…'
        : 'Enregistrer'

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()

    const parsed = productEditFormSchema.safeParse(form)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Formulaire invalide.')
      return
    }

    try {
      if (mode === 'create') {
        const newProduct = await createProduct.mutateAsync(
          productEditFormToCreateInput(parsed.data)
        )
        if (tags.length > 0) {
          await updateTags.mutateAsync({
            productId: newProduct.id,
            slug: newProduct.slug,
            tags: tags.map((t) => ({ tagId: t.tagId, relevance: t.relevance })),
          })
        }
        if (pendingIngredients.length > 0) {
          await Promise.all(
            pendingIngredients.map((i) => {
              const value = i.concentrationValue.trim()
              const parsedValue = value === '' ? undefined : parseFloat(value)
              return addIngredient.mutateAsync({
                productId: newProduct.id,
                slug: newProduct.slug,
                ingredientId: i.ingredientId,
                concentrationValue:
                  parsedValue != null && !Number.isNaN(parsedValue) ? parsedValue : undefined,
                concentrationUnit: i.concentrationUnit === '' ? undefined : i.concentrationUnit,
              })
            })
          )
        }
        onSuccess(newProduct.slug)
      } else {
        const [updated] = await Promise.all([
          updateProduct.mutateAsync({
            id: product.id,
            data: productEditFormToUpdateInput(parsed.data, {
              priceCents: product.priceCents,
              totalAmount: product.totalAmount,
              amountUnit: product.amountUnit,
              inci: product.inci,
              description: product.description,
              notes: product.notes,
              url: product.url,
              imageUrl: product.imageUrl,
            }),
          }),
          updateTags.mutateAsync({
            productId: product.id,
            slug: product.slug,
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
  }

  const ingredientItems = mode === 'edit' ? product.ingredients : pendingIngredients

  function handleRemoveIngredient(ingredientId: string) {
    if (mode === 'edit') {
      removeIngredient.mutate({ productId: product.id, slug: product.slug, ingredientId })
    } else {
      setPendingIngredients((prev) => prev.filter((i) => i.ingredientId !== ingredientId))
    }
  }

  return (
    <form
      className="product-edit-form"
      onSubmit={handleSubmit}
      aria-label={
        mode === 'create' ? 'Créer un produit' : `Modifier ${product?.name ?? 'le produit'}`
      }
    >
      {error && <FormMessage variant="error">{error}</FormMessage>}

      {mode === 'create' && similarProducts && similarProducts.length > 0 && (
        <div className="product-edit-form__duplicate-warning" role="alert">
          <p>
            {similarProducts.length === 1
              ? 'Un produit similaire existe déjà :'
              : 'Des produits similaires existent déjà :'}
          </p>
          <ul>
            {similarProducts.map((p) => (
              <li key={p.id}>
                <Link to="/products/$slug" params={{ slug: p.slug }}>
                  {p.name} — {p.brand}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <FormField label="Domaine" required>
        <ChipGroup
          options={PRODUCT_CATEGORY_VALUES.map((v) => ({
            value: v,
            label: PRODUCT_CATEGORY_LABELS[v],
          }))}
          selected={[form.category]}
          onChange={([v]) => {
            if (!v) return
            const next = v as ProductCategory
            setForm((prev) => ({ ...prev, category: next, kind: '', unit: '', amountUnit: '' }))
            const nextDomain = PRODUCT_CATEGORY_TO_DOMAIN_TAB[next]
            const nextValid = new Set<string>(DOMAIN_PRODUCT_FILTER_CATEGORIES[nextDomain])
            setTags((prev) =>
              prev.filter((t) => {
                const meta = allTags?.find((at) => at.id === t.tagId)
                return meta?.category != null && nextValid.has(meta.category)
              })
            )
          }}
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
        />

        <FormField label="Marque" htmlFor="product-form-brand" required>
          <BrandCombobox
            id="product-form-brand"
            value={form.brand}
            onChange={(v, confirmed) => {
              setForm((prev) => ({ ...prev, brand: v }))
              setBrandConfirmed(confirmed)
            }}
          />
        </FormField>
      </div>

      <FormField label="Type de produit" required>
        <ChipGroup
          options={Object.values(PRODUCT_KINDS[form.category] ?? {}).map((v) => ({
            value: v as string,
            label: PRODUCT_KIND_LABELS[v as keyof typeof PRODUCT_KIND_LABELS] ?? (v as string),
          }))}
          selected={form.kind ? [form.kind] : []}
          onChange={([v]) => setForm((prev) => ({ ...prev, kind: v ?? '' }))}
          mode="exclusive"
          aria-label="Type de produit"
        />
      </FormField>

      <FormField label="Conditionnement" required>
        <ChipGroup
          options={Object.values(PRODUCT_UNITS[form.category] ?? {}).map((v) => ({
            value: v as string,
            label: PRODUCT_UNIT_LABELS[v as keyof typeof PRODUCT_UNIT_LABELS] ?? (v as string),
          }))}
          selected={form.unit ? [form.unit] : []}
          onChange={([v]) => setForm((prev) => ({ ...prev, unit: v ?? '' }))}
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
            <ChipGroup
              options={PRODUCT_AMOUNT_UNITS[form.category].map((v) => ({
                value: v,
                label: PRODUCT_AMOUNT_UNIT_LABELS[v],
              }))}
              selected={form.amountUnit ? [form.amountUnit] : []}
              onChange={([v]) => setForm((prev) => ({ ...prev, amountUnit: v ?? '' }))}
              mode="exclusive"
              aria-label="Unité de contenance"
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
        <Input
          label="Image du produit"
          id="edit-image-url"
          type="url"
          value={form.imageUrl}
          onChange={handleChange('imageUrl')}
          placeholder="https://…"
        />
      </div>

      <FormField label="INCI" htmlFor="edit-inci">
        <textarea
          id="edit-inci"
          className="product-edit-form__textarea"
          value={form.inci}
          onChange={handleChange('inci')}
          placeholder="Liste INCI des ingrédients…"
          rows={4}
        />
      </FormField>

      <FormField label="Description" htmlFor="edit-description" hint="Markdown supporté">
        <textarea
          id="edit-description"
          className="product-edit-form__textarea"
          value={form.description}
          onChange={handleChange('description')}
          placeholder="Description du produit (Markdown supporté)"
          rows={5}
        />
      </FormField>

      <FormField label="Notes" htmlFor="edit-notes">
        <textarea
          id="edit-notes"
          className="product-edit-form__textarea"
          value={form.notes}
          onChange={handleChange('notes')}
          placeholder="Notes personnelles sur ce produit…"
          rows={4}
        />
      </FormField>

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

      <fieldset className="form-field">
        <legend className="form-field__label">Ingrédients</legend>
        <div className="product-edit-ingredients">
          {ingredientItems.length === 0 && (
            <p className="product-edit-ingredients__empty">
              {mode === 'edit' ? 'Aucun ingrédient associé.' : 'Aucun ingrédient ajouté.'}
            </p>
          )}
          {ingredientItems.map((ing) => (
            <IngredientRow
              key={ing.ingredientId}
              ingredientId={ing.ingredientId}
              ingredientName={ing.ingredientName}
              initialValue={
                mode === 'edit'
                  ? ((ing as ProductWithIngredients['ingredients'][number]).concentrationValue ??
                    '')
                  : (ing as PendingIngredient).concentrationValue
              }
              initialUnit={
                mode === 'edit'
                  ? (((ing as ProductWithIngredients['ingredients'][number]).concentrationUnit ??
                      '') as ProductConcentrationUnit | '')
                  : (ing as PendingIngredient).concentrationUnit
              }
              onPersist={({ value, unit }) => {
                if (mode === 'edit') {
                  const trimmed = value.trim()
                  const parsed = trimmed === '' ? null : parseFloat(trimmed)
                  if (parsed !== null && Number.isNaN(parsed)) return
                  updateIngredient.mutate({
                    productId: product.id,
                    slug: product.slug,
                    ingredientId: ing.ingredientId,
                    concentrationValue: parsed,
                    concentrationUnit: unit === '' ? null : unit,
                  })
                } else {
                  setPendingIngredients((prev) =>
                    prev.map((p) =>
                      p.ingredientId === ing.ingredientId
                        ? { ...p, concentrationValue: value, concentrationUnit: unit }
                        : p
                    )
                  )
                }
              }}
              onRemove={() => handleRemoveIngredient(ing.ingredientId)}
              removing={mode === 'edit' && removeIngredient.isPending}
              updating={mode === 'edit' && updateIngredient.isPending}
            />
          ))}
        </div>

        <IngredientSearch
          existingIds={ingredientItems.map((i) => i.ingredientId)}
          onAdd={(ingredientId, ingredientName) => {
            if (mode === 'edit') {
              addIngredient.mutate({ productId: product.id, slug: product.slug, ingredientId })
            } else {
              setPendingIngredients((prev) => [
                ...prev,
                { ingredientId, ingredientName, concentrationValue: '', concentrationUnit: '' },
              ])
            }
          }}
        />
      </fieldset>

      <div className="product-edit-form__actions">
        {mode === 'edit' ? (
          <Button to="/products/$slug" params={{ slug: product?.slug }} variant="outline">
            Annuler
          </Button>
        ) : (
          <Button to="/products" variant="outline">
            Annuler
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitDisabled}
          loading={
            mode === 'create'
              ? createProduct.isPending
              : updateProduct.isPending || updateTags.isPending
          }
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
