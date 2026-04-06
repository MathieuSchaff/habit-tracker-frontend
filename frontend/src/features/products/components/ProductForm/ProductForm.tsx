import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/component/Button/Button'
import { FormMessage } from '@/component/Feedback/FormMessage/FormMessage'
import { FormField } from '@/component/Input/FormField/FormField'
import { Input } from '@/component/Input/Input'
import { TagManager } from '@/component/Input/TagManager/TagManager'
import { type TagState, useFormTags } from '@/hooks/useFormTags'
import {
  productQueries,
  useAddProductIngredient,
  useCreateProduct,
  useRemoveProductIngredient,
  useUpdateProduct,
  useUpdateProductTags,
} from '../../../../lib/queries/products'
import { tagQueries } from '../../../../lib/queries/tags'
import { BrandCombobox } from '../BrandCombobox/BrandCombobox'
import { IngredientSearch } from '../IngredientSearch/IngredientSearch'
import './ProductForm.css'

type ProductWithIngredients = {
  id: string
  slug: string
  name: string | null
  brand: string | null
  kind: string | null
  unit: string | null
  priceCents: number | null
  totalAmount: number | null
  amountUnit: string | null
  inci: string | null
  description: string | null
  notes: string | null
  url: string | null
  ingredients: Array<{
    ingredientId: string
    ingredientName: string
    concentrationValue: string | null
  }>
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

  const [form, setForm] = useState({
    name: product?.name ?? '',
    brand: product?.brand ?? '',
    kind: product?.kind ?? '',
    unit: product?.unit ?? '',
    priceEuros: product?.priceCents != null ? (product.priceCents / 100).toFixed(2) : '',
    totalAmount: product?.totalAmount != null ? String(product.totalAmount) : '',
    amountUnit: product?.amountUnit ?? '',
    inci: product?.inci ?? '',
    description: product?.description ?? '',
    notes: product?.notes ?? '',
    url: product?.url ?? '',
  })

  const { tags, addTag, removeTag, updateRelevance, availableTags, isTagsDirty } = useFormTags({
    initialTags,
    allTags,
  })

  const [brandConfirmed, setBrandConfirmed] = useState(mode === 'edit')
  const [pendingIngredients, setPendingIngredients] = useState<
    Array<{ ingredientId: string; ingredientName: string }>
  >([])
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

  const originalPriceEuros =
    product?.priceCents != null ? (product.priceCents / 100).toFixed(2) : ''
  const originalAmount = product?.totalAmount != null ? String(product.totalAmount) : ''

  const isDirty =
    form.name !== (product?.name ?? '') ||
    form.brand !== (product?.brand ?? '') ||
    form.kind !== (product?.kind ?? '') ||
    form.unit !== (product?.unit ?? '') ||
    form.priceEuros !== originalPriceEuros ||
    form.totalAmount !== originalAmount ||
    form.amountUnit !== (product?.amountUnit ?? '') ||
    form.inci !== (product?.inci ?? '') ||
    form.description !== (product?.description ?? '') ||
    form.notes !== (product?.notes ?? '') ||
    form.url !== (product?.url ?? '') ||
    isTagsDirty

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

    if (!form.name.trim()) {
      setError('Le nom du produit est obligatoire.')
      return
    }
    if (!form.brand.trim()) {
      setError('La marque est obligatoire.')
      return
    }
    if (!form.kind.trim()) {
      setError('La catégorie est obligatoire.')
      return
    }
    if (!form.unit.trim()) {
      setError("L'unité est obligatoire.")
      return
    }

    // Backend expects cents
    const parsedPrice = form.priceEuros.trim()
      ? Math.round(parseFloat(form.priceEuros) * 100)
      : undefined
    const parsedAmount = form.totalAmount.trim() ? parseInt(form.totalAmount, 10) : undefined
    const productData = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      kind: form.kind.trim(),
      unit: form.unit.trim(),
      priceCents: parsedPrice,
      totalAmount: parsedAmount,
      amountUnit: form.amountUnit.trim() || undefined,
      inci: form.inci.trim() || undefined,
      description: form.description.trim() || undefined,
      notes: form.notes.trim() || undefined,
      url: form.url.trim() || undefined,
    }

    try {
      if (mode === 'create') {
        const newProduct = await createProduct.mutateAsync(productData)
        if (tags.length > 0) {
          await updateTags.mutateAsync({
            productId: newProduct.id,
            tags: tags.map((t) => ({ tagId: t.tagId, relevance: t.relevance })),
          })
        }
        if (pendingIngredients.length > 0) {
          await Promise.all(
            pendingIngredients.map((i) =>
              addIngredient.mutateAsync({
                productId: newProduct.id,
                ingredientId: i.ingredientId,
              })
            )
          )
        }
        onSuccess(newProduct.slug)
      } else {
        const [updated] = await Promise.all([
          updateProduct.mutateAsync({ id: product?.id, data: productData }),
          updateTags.mutateAsync({
            productId: product?.id,
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
      removeIngredient.mutate({ productId: product.id, ingredientId })
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

      <div className="product-edit-form__row">
        <Input
          label="Catégorie"
          id="edit-kind"
          required
          value={form.kind}
          onChange={handleChange('kind')}
          placeholder="Ex : skincare, complément, huile…"
        />

        <Input
          label="Unité"
          id="edit-unit"
          required
          value={form.unit}
          onChange={handleChange('unit')}
          placeholder="Ex : ml, gélule, goutte…"
        />
      </div>

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
            <Input
              id="edit-amount-unit"
              className="product-edit-form__input--short"
              value={form.amountUnit}
              onChange={handleChange('amountUnit')}
              placeholder="ml, g…"
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
            <div key={ing.ingredientId} className="product-edit-ingredient">
              <span className="product-edit-ingredient__name">{ing.ingredientName}</span>
              <button
                type="button"
                className="product-edit-ingredient__remove"
                aria-label={`Retirer ${ing.ingredientName}`}
                onClick={() => handleRemoveIngredient(ing.ingredientId)}
                disabled={mode === 'edit' && removeIngredient.isPending}
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        <IngredientSearch
          existingIds={ingredientItems.map((i) => i.ingredientId)}
          onAdd={(ingredientId, ingredientName) => {
            if (mode === 'edit') {
              addIngredient.mutate({ productId: product?.id, ingredientId })
            } else {
              setPendingIngredients((prev) => [...prev, { ingredientId, ingredientName }])
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
