import type { ProductConcentrationUnit } from '@habit-tracker/shared'

import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import {
  PRODUCT_FORM_ERRORS,
  type ProductFormField,
} from '@/features/products/components/ProductForm/formErrors'
import {
  type ProductEditFormInput,
  productEditFormSchema,
  productEditFormToCreateInput,
  productEditFormToUpdateInput,
} from '@/features/products/components/ProductForm/ProductForm.schema'
import { extractFormError } from '@/lib/helpers/apiError'
import {
  type ProductDetail,
  productQueries,
  useAddProductIngredient,
  useCreateProduct,
  useUpdateProduct,
  useUpdateProductTags,
} from '@/lib/queries/products'

type TagPayload = { tagId: string; relevance: 'primary' | 'secondary' | 'avoid' }

type PendingIngredient = {
  ingredientId: string
  concentrationValue: string
  concentrationUnit: ProductConcentrationUnit | ''
}

type CreateArgs = {
  mode: 'create'
  product?: never
  pendingIngredients: PendingIngredient[]
}

type EditArgs = {
  mode: 'edit'
  product: ProductDetail
  pendingIngredients?: never
}

type Args = (CreateArgs | EditArgs) & {
  form: ProductEditFormInput
  tags: Array<{ tagId: string; relevance: TagPayload['relevance'] }>
  onSuccess: (slug: string) => void
}

export function useProductFormSubmit(args: Args) {
  const queryClient = useQueryClient()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const updateTags = useUpdateProductTags()
  const addIngredient = useAddProductIngredient()

  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<{ field: ProductFormField; message: string } | null>(
    null
  )

  const tagsPayload = (): TagPayload[] =>
    args.tags.map((t) => ({ tagId: t.tagId, relevance: t.relevance }))

  async function submitCreate(data: ProductEditFormInput): Promise<string> {
    if (args.mode !== 'create') throw new Error('submitCreate called in edit mode')
    const newProduct = await createProduct.mutateAsync(productEditFormToCreateInput(data))
    if (args.tags.length > 0) {
      await updateTags.mutateAsync({
        productId: newProduct.id,
        slug: newProduct.slug,
        tags: tagsPayload(),
      })
    }
    if (args.pendingIngredients.length > 0) {
      await Promise.all(
        args.pendingIngredients.map((i) => {
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
    return newProduct.slug
  }

  async function submitEdit(data: ProductEditFormInput, current: ProductDetail): Promise<string> {
    const [updated] = await Promise.all([
      updateProduct.mutateAsync({
        id: current.id,
        data: productEditFormToUpdateInput(data, current),
      }),
      updateTags.mutateAsync({
        productId: current.id,
        slug: current.slug,
        tags: tagsPayload(),
      }),
    ])
    // Drop stale bySlug cache when slug changes, else orphaned under old key.
    if (updated.slug !== current.slug) {
      queryClient.removeQueries({ queryKey: productQueries.bySlug(current.slug).queryKey })
    }
    return updated.slug
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()

    const parsed = productEditFormSchema.safeParse(args.form)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Formulaire invalide.')
      return
    }

    try {
      const nextSlug =
        args.mode === 'create'
          ? await submitCreate(parsed.data)
          : await submitEdit(parsed.data, args.product)
      args.onSuccess(nextSlug)
    } catch (err) {
      const { field, message } = extractFormError(err, PRODUCT_FORM_ERRORS)
      setError(message)
      setFieldError(field ? { field, message } : null)
    }
  }

  const isUpdatePending = updateProduct.isPending || updateTags.isPending
  const isPending = args.mode === 'create' ? createProduct.isPending : isUpdatePending

  const submitLabel =
    args.mode === 'create'
      ? createProduct.isPending
        ? 'Création…'
        : 'Créer le produit'
      : isUpdatePending
        ? 'Enregistrement…'
        : 'Enregistrer'

  return {
    handleSubmit,
    error,
    fieldError,
    clearError: () => {
      setError(null)
      setFieldError(null)
    },
    isPending,
    submitLabel,
  }
}
