import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Save, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { FormField } from '@/component/Input/FormField/FormField'
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
      // product and initialTags should not be passed in create mode
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

  const handleSubmit = useCallback(
    async (e: React.SubmitEvent<HTMLFormElement>) => {
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
    },
    [
      form,
      mode,
      product,
      tags,
      pendingIngredients,
      createProduct,
      updateProduct,
      updateTags,
      addIngredient,
      onSuccess,
    ]
  )

  return (
    <form className="product-edit-form" onSubmit={handleSubmit}>
      {error && (
        <div className="product-edit-form__error" role="alert">
          {error}
        </div>
      )}

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
        <FormField label="Nom" htmlFor="edit-name" required>
          <input
            id="edit-name"
            className="product-edit-form__input"
            type="text"
            value={form.name}
            onChange={handleChange('name')}
            placeholder="Nom du produit"
            // biome-ignore lint: autofocus ok
            autoFocus
          />
        </FormField>

        <FormField label="Marque" htmlFor="product-form-brand" required>
          <BrandCombobox
            id="product-form-brand"
            value={form.brand ?? ''}
            onChange={(v, confirmed) => {
              setForm((prev) => ({ ...prev, brand: v }))
              setBrandConfirmed(confirmed)
            }}
            inputClassName="product-edit-form__input"
          />
        </FormField>
      </div>

      <div className="product-edit-form__row">
        <FormField label="Catégorie" htmlFor="edit-kind" required>
          <input
            id="edit-kind"
            className="product-edit-form__input"
            type="text"
            value={form.kind}
            onChange={handleChange('kind')}
            placeholder="Ex : skincare, complément, huile…"
          />
        </FormField>

        <FormField label="Unité" htmlFor="edit-unit" required>
          <input
            id="edit-unit"
            className="product-edit-form__input"
            type="text"
            value={form.unit}
            onChange={handleChange('unit')}
            placeholder="Ex : ml, gélule, goutte…"
          />
        </FormField>
      </div>

      <div className="product-edit-form__row">
        <FormField label="Contenance" htmlFor="edit-total-amount">
          <div className="product-edit-form__inline">
            <input
              id="edit-total-amount"
              className="product-edit-form__input"
              type="number"
              min="1"
              value={form.totalAmount}
              onChange={handleChange('totalAmount')}
              placeholder="Ex : 30"
            />
            <input
              id="edit-amount-unit"
              className="product-edit-form__input product-edit-form__input--short"
              type="text"
              value={form.amountUnit}
              onChange={handleChange('amountUnit')}
              placeholder="ml, g…"
              aria-label="Unité de contenance"
            />
          </div>
        </FormField>

        <FormField label="Prix (€)" htmlFor="edit-price">
          <input
            id="edit-price"
            className="product-edit-form__input"
            type="number"
            min="0"
            step="0.01"
            value={form.priceEuros}
            onChange={handleChange('priceEuros')}
            placeholder="Ex : 12.90"
          />
        </FormField>
      </div>

      <div className="product-edit-form__row">
        <FormField label="Lien produit" htmlFor="edit-url">
          <input
            id="edit-url"
            className="product-edit-form__input"
            type="url"
            value={form.url}
            onChange={handleChange('url')}
            placeholder="https://…"
          />
        </FormField>
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

      <FormField label="Tags" htmlFor="tags">
        <TagManager
          tags={tags}
          availableTags={availableTags}
          onAddTag={addTag}
          onRemoveTag={removeTag}
          onUpdateRelevance={updateRelevance}
        />
      </FormField>

      <FormField label="Ingrédients" htmlFor="ingredients">
        <div className="product-edit-ingredients">
          {mode === 'edit' ? (
            <>
              {product?.ingredients.length === 0 && (
                <p className="product-edit-ingredients__empty">Aucun ingrédient associé.</p>
              )}
              {product?.ingredients.map((ing) => (
                <div key={ing.ingredientId} className="product-edit-ingredient">
                  <span className="product-edit-ingredient__name">{ing.ingredientName}</span>
                  <button
                    type="button"
                    className="product-edit-ingredient__remove"
                    aria-label={`Retirer ${ing.ingredientName}`}
                    onClick={() =>
                      removeIngredient.mutate({
                        productId: product?.id,
                        ingredientId: ing.ingredientId,
                      })
                    }
                    disabled={removeIngredient.isPending}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </>
          ) : (
            <>
              {pendingIngredients.length === 0 && (
                <p className="product-edit-ingredients__empty">Aucun ingrédient ajouté.</p>
              )}
              {pendingIngredients.map((ing) => (
                <div key={ing.ingredientId} className="product-edit-ingredient">
                  <span className="product-edit-ingredient__name">{ing.ingredientName}</span>
                  <button
                    type="button"
                    className="product-edit-ingredient__remove"
                    aria-label={`Retirer ${ing.ingredientName}`}
                    onClick={() =>
                      setPendingIngredients((prev) =>
                        prev.filter((i) => i.ingredientId !== ing.ingredientId)
                      )
                    }
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        <IngredientSearch
          existingIds={
            mode === 'edit'
              ? product?.ingredients.map((i) => i.ingredientId)
              : pendingIngredients.map((i) => i.ingredientId)
          }
          onAdd={(ingredientId, ingredientName) => {
            if (mode === 'edit') {
              addIngredient.mutate({ productId: product?.id, ingredientId })
            } else {
              setPendingIngredients((prev) => [...prev, { ingredientId, ingredientName }])
            }
          }}
        />
      </FormField>

      <div className="product-edit-form__actions">
        {mode === 'edit' ? (
          <Link
            to="/products/$slug"
            params={{ slug: product?.slug }}
            className="product-edit-form__btn product-edit-form__btn--cancel"
          >
            <X size={16} />
            Annuler
          </Link>
        ) : (
          <Link to="/products" className="product-edit-form__btn product-edit-form__btn--cancel">
            <X size={16} />
            Annuler
          </Link>
        )}
        <button
          type="submit"
          className="product-edit-form__btn product-edit-form__btn--save"
          disabled={isSubmitDisabled}
        >
          <Save size={16} />
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
