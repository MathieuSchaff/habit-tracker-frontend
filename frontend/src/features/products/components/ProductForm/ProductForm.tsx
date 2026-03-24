import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Save, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { ingredientQueries } from '../../../../lib/queries/ingredients'
import {
  productQueries,
  useAddProductIngredient,
  useCreateProduct,
  useRemoveProductIngredient,
  useUpdateProduct,
  useUpdateProductTags,
} from '../../../../lib/queries/products'
import { tagQueries } from '../../../../lib/queries/tags'
import '../../../../styles/common/ingredients-shared.css'

import { BrandCombobox } from '../BrandCombobox/BrandCombobox'
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

type TagState = {
  tagId: string
  tagName: string
  relevance: 'primary' | 'secondary' | 'avoid'
}

interface ProductFormProps {
  mode: 'create' | 'edit'
  product?: ProductWithIngredients
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

  const [brandConfirmed, setBrandConfirmed] = useState(mode === 'edit')
  const [tags, setTags] = useState<TagState[]>(initialTags)
  const [pendingIngredients, setPendingIngredients] = useState<
    Array<{ ingredientId: string; ingredientName: string }>
  >([])
  const [error, setError] = useState<string | null>(null)

  // Duplicate detection (debounced)
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

  const handleAddTag = (tagId: string) => {
    const tag = allTags?.find((t) => t.id === tagId)
    if (tag && !tags.find((t) => t.tagId === tagId)) {
      setTags((prev) => [...prev, { tagId, tagName: tag.name, relevance: 'secondary' }])
    }
  }

  const handleRemoveTag = (tagId: string) => {
    setTags((prev) => prev.filter((t) => t.tagId !== tagId))
  }

  const handleUpdateTagRelevance = (
    tagId: string,
    relevance: 'primary' | 'secondary' | 'avoid'
  ) => {
    setTags((prev) => prev.map((t) => (t.tagId === tagId ? { ...t, relevance } : t)))
  }

  const availableTags = useMemo(
    () => allTags?.filter((at) => !tags.find((t) => t.tagId === at.id)) ?? [],
    [allTags, tags]
  )

  // isDirty (edit mode)
  const sortedTagsKey = (arr: { id: string; r: string }[]) =>
    JSON.stringify([...arr].sort((a, b) => a.id.localeCompare(b.id)))

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
    sortedTagsKey(tags.map((t) => ({ id: t.tagId, r: t.relevance }))) !==
      sortedTagsKey(initialTags.map((t) => ({ id: t.tagId, r: t.relevance })))

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
    async (e: React.FormEvent<HTMLFormElement>) => {
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
            updateProduct.mutateAsync({ id: product!.id, data: productData }),
            updateTags.mutateAsync({
              productId: product!.id,
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
        <div className="product-edit-form__field">
          <label className="product-edit-form__label" htmlFor="edit-name">
            Nom <span className="product-edit-form__required">*</span>
          </label>
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
        </div>

        <div className="product-edit-form__field">
          <label htmlFor="product-form-brand" className="product-edit-form__label">
            Marque <span className="product-edit-form__required">*</span>
          </label>
          <BrandCombobox
            id="product-form-brand"
            value={form.brand ?? ''}
            onChange={(v, confirmed) => {
              setForm((prev) => ({ ...prev, brand: v }))
              setBrandConfirmed(confirmed)
            }}
            inputClassName="product-edit-form__input"
          />
        </div>
      </div>

      <div className="product-edit-form__row">
        <div className="product-edit-form__field">
          <label className="product-edit-form__label" htmlFor="edit-kind">
            Catégorie <span className="product-edit-form__required">*</span>
          </label>
          <input
            id="edit-kind"
            className="product-edit-form__input"
            type="text"
            value={form.kind}
            onChange={handleChange('kind')}
            placeholder="Ex : skincare, complément, huile…"
          />
        </div>

        <div className="product-edit-form__field">
          <label className="product-edit-form__label" htmlFor="edit-unit">
            Unité <span className="product-edit-form__required">*</span>
          </label>
          <input
            id="edit-unit"
            className="product-edit-form__input"
            type="text"
            value={form.unit}
            onChange={handleChange('unit')}
            placeholder="Ex : ml, gélule, goutte…"
          />
        </div>
      </div>

      <div className="product-edit-form__row">
        <div className="product-edit-form__field">
          <label className="product-edit-form__label" htmlFor="edit-total-amount">
            Contenance
          </label>
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
        </div>

        <div className="product-edit-form__field">
          <label className="product-edit-form__label" htmlFor="edit-price">
            Prix (€)
          </label>
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
        </div>
      </div>

      <div className="product-edit-form__row">
        <div className="product-edit-form__field">
          <label className="product-edit-form__label" htmlFor="edit-url">
            Lien produit
          </label>
          <input
            id="edit-url"
            className="product-edit-form__input"
            type="url"
            value={form.url}
            onChange={handleChange('url')}
            placeholder="https://…"
          />
        </div>
      </div>

      <div className="product-edit-form__field">
        <label className="product-edit-form__label" htmlFor="edit-inci">
          INCI
        </label>
        <textarea
          id="edit-inci"
          className="product-edit-form__textarea"
          value={form.inci}
          onChange={handleChange('inci')}
          placeholder="Liste INCI des ingrédients…"
          rows={4}
        />
      </div>

      <div className="product-edit-form__field">
        <label className="product-edit-form__label" htmlFor="edit-description">
          Description
        </label>
        <textarea
          id="edit-description"
          className="product-edit-form__textarea"
          value={form.description}
          onChange={handleChange('description')}
          placeholder="Description du produit (Markdown supporté)"
          rows={5}
        />
        <span className="product-edit-form__hint">Markdown supporté</span>
      </div>

      <div className="product-edit-form__field">
        <label className="product-edit-form__label" htmlFor="edit-notes">
          Notes
        </label>
        <textarea
          id="edit-notes"
          className="product-edit-form__textarea"
          value={form.notes}
          onChange={handleChange('notes')}
          placeholder="Notes personnelles sur ce produit…"
          rows={4}
        />
      </div>

      {/* ── Tags ── */}
      <div className="product-edit-form__field">
        {/* biome-ignore lint/a11y/noLabelWithoutControl: group label for dynamic tag list */}
        <label className="product-edit-form__label">Tags</label>
        <div className="product-edit-tags">
          {tags.map((tag) => (
            <div key={tag.tagId} className={`product-edit-tag product-edit-tag--${tag.relevance}`}>
              <span className="product-edit-tag__name">{tag.tagName}</span>
              <select
                value={tag.relevance}
                className="product-edit-tag__relevance"
                aria-label={`Pertinence du tag ${tag.tagName}`}
                onChange={(e) =>
                  handleUpdateTagRelevance(
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
                className="product-edit-tag__remove"
                aria-label={`Retirer le tag ${tag.tagName}`}
                onClick={() => handleRemoveTag(tag.tagId)}
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        <div className="product-edit-add-tag">
          <select
            className="product-edit-form__input"
            aria-label="Ajouter un tag"
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

      {/* ── Ingredients ── */}
      <div className="product-edit-form__field">
        {/* biome-ignore lint/a11y/noLabelWithoutControl: group label for dynamic ingredient list */}
        <label className="product-edit-form__label">
          Ingrédients
          {(mode === 'edit' ? product!.ingredients.length : pendingIngredients.length) > 0 && (
            <span className="product-edit-form__count">
              {mode === 'edit' ? product!.ingredients.length : pendingIngredients.length}
            </span>
          )}
        </label>

        <div className="product-edit-ingredients">
          {mode === 'edit' ? (
            <>
              {product!.ingredients.length === 0 && (
                <p className="product-edit-ingredients__empty">Aucun ingrédient associé.</p>
              )}
              {product!.ingredients.map((ing) => (
                <div key={ing.ingredientId} className="product-edit-ingredient">
                  <span className="product-edit-ingredient__name">{ing.ingredientName}</span>
                  <button
                    type="button"
                    className="product-edit-ingredient__remove"
                    aria-label={`Retirer ${ing.ingredientName}`}
                    onClick={() =>
                      removeIngredient.mutate({
                        productId: product!.id,
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
              ? product!.ingredients.map((i) => i.ingredientId)
              : pendingIngredients.map((i) => i.ingredientId)
          }
          onAdd={(ingredientId, ingredientName) => {
            if (mode === 'edit') {
              addIngredient.mutate({ productId: product!.id, ingredientId })
            } else {
              setPendingIngredients((prev) => [...prev, { ingredientId, ingredientName }])
            }
          }}
        />
      </div>

      <div className="product-edit-form__actions">
        {mode === 'edit' ? (
          <Link
            to="/products/$slug"
            params={{ slug: product!.slug }}
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

function IngredientSearch({
  existingIds,
  onAdd,
}: {
  existingIds: string[]
  onAdd: (ingredientId: string, ingredientName: string) => void
}) {
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const { data: results } = useQuery(ingredientQueries.search(query))
  const listboxId = 'ingredient-search-listbox'

  const available = results?.filter((r) => !existingIds.includes(r.id)) ?? []

  function handleSelect(ing: { id: string; name: string }) {
    onAdd(ing.id, ing.name)
    setQuery('')
    setHighlightedIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (available.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev < available.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : available.length - 1))
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < available.length) {
        e.preventDefault()
        handleSelect(available[highlightedIndex])
      } else if (available.length > 0) {
        e.preventDefault()
        handleSelect(available[0])
      }
    } else if (e.key === 'Escape') {
      setHighlightedIndex(-1)
      setQuery('')
    }
  }

  const isOpen = query.length > 0 && available.length > 0
  const activeDescendant =
    highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined

  return (
    <div className="product-edit-ingredient-search">
      <input
        type="text"
        role="combobox"
        className="product-edit-form__input"
        placeholder="Rechercher un ingrédient à ajouter…"
        aria-label="Rechercher un ingrédient"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setHighlightedIndex(-1)
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={activeDescendant}
        aria-autocomplete="list"
      />
      {isOpen && (
        <div id={listboxId} role="listbox" className="product-edit-ingredient-results">
          {available.map((ing, index) => (
            // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard nav handled on the input per WAI-ARIA combobox pattern
            <div
              key={ing.id}
              id={`${listboxId}-option-${index}`}
              role="option"
              tabIndex={-1}
              aria-selected={index === highlightedIndex}
              className={`product-edit-ingredient-result${index === highlightedIndex ? ' product-edit-ingredient-result--highlighted' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(ing)}
            >
              <span className="product-edit-ingredient-result__name">{ing.name}</span>
              {ing.category && (
                <span className="product-edit-ingredient-result__category">{ing.category}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
