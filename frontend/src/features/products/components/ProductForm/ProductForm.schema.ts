import {
  type CreateProductInput,
  PRODUCT_AMOUNT_UNIT_VALUES,
  PRODUCT_CATEGORY_VALUES,
  PRODUCT_TEXTURE_VALUES,
  PRODUCT_UNIT_VALUES,
  type ProductAmountUnit,
  type ProductTexture,
  type ProductUnit,
  type UpdateProductInput,
} from '@habit-tracker/shared'

import { z } from 'zod'

import type { ProductDetail } from '@/lib/queries/products'

// Form-state schema: every field is what the DOM holds (strings).
// Validation messages are FR — they surface directly in the form.
export const productEditFormSchema = z.object({
  name: z.string().trim().min(1, 'Le nom du produit est obligatoire.').max(200),
  slug: z
    .string()
    .trim()
    .max(100)
    .refine((v) => v === '' || /^[a-z0-9-]+$/.test(v), {
      message: 'Slug invalide : minuscules, chiffres et tirets uniquement.',
    }),
  brand: z.string().trim().min(1, 'La marque est obligatoire.').max(200),
  category: z.enum(PRODUCT_CATEGORY_VALUES),
  kind: z.string().trim().min(1, 'La catégorie est obligatoire.').max(100),
  unit: z
    .string()
    .trim()
    .min(1, "L'unité est obligatoire.")
    .refine((v) => (PRODUCT_UNIT_VALUES as readonly string[]).includes(v), {
      message: 'Unité invalide.',
    }),
  priceEuros: z
    .string()
    .trim()
    .refine((v) => v === '' || (!Number.isNaN(parseFloat(v)) && parseFloat(v) >= 0), {
      message: 'Prix invalide.',
    }),
  totalAmount: z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d+$/.test(v) && parseInt(v, 10) >= 1), {
      message: 'Quantité invalide.',
    }),
  amountUnit: z
    .string()
    .trim()
    .refine((v) => v === '' || (PRODUCT_AMOUNT_UNIT_VALUES as readonly string[]).includes(v), {
      message: 'Unité de contenance invalide.',
    }),
  // Optional. Empty = unset. Backend stores ProductTexture | null.
  texture: z
    .string()
    .trim()
    .refine((v) => v === '' || (PRODUCT_TEXTURE_VALUES as readonly string[]).includes(v), {
      message: 'Texture invalide.',
    }),
  inci: z.string().max(5000),
  description: z.string().max(5000),
  notes: z.string().max(5000),
  // Empty allowed (= cleared); otherwise must be a valid URL.
  url: z.union([z.literal(''), z.url('URL invalide.').max(2000)]),
  imageUrl: z.union([z.literal(''), z.url('URL image invalide.').max(2000)]),
})

export type ProductEditFormInput = z.infer<typeof productEditFormSchema>

// Empty form state for the create flow.
export function emptyProductEditForm(): ProductEditFormInput {
  return {
    name: '',
    slug: '',
    brand: '',
    category: PRODUCT_CATEGORY_VALUES[0],
    kind: '',
    unit: '',
    priceEuros: '',
    totalAmount: '',
    amountUnit: '',
    texture: '',
    inci: '',
    description: '',
    notes: '',
    url: '',
    imageUrl: '',
  }
}

// Entity → form conversion used to seed the edit page. Accepts the full
// ProductDetail (extra fields ignored) so the form picks up new backend
// columns without manual snapshot-type maintenance.
export function productToEditForm(p: ProductDetail): ProductEditFormInput {
  return {
    name: p.name ?? '',
    slug: p.slug ?? '',
    brand: p.brand ?? '',
    category: (p.category ?? PRODUCT_CATEGORY_VALUES[0]) as ProductEditFormInput['category'],
    kind: p.kind ?? '',
    unit: p.unit ?? '',
    priceEuros: p.priceCents != null ? (p.priceCents / 100).toFixed(2) : '',
    totalAmount: p.totalAmount != null ? String(p.totalAmount) : '',
    amountUnit: p.amountUnit ?? '',
    texture: p.texture ?? '',
    inci: p.inci ?? '',
    description: p.description ?? '',
    notes: p.notes ?? '',
    url: p.url ?? '',
    imageUrl: p.imageUrl ?? '',
  }
}

// Wire format produced for POST /api/products: empty = omit (undefined).
export function productEditFormToCreateInput(form: ProductEditFormInput): CreateProductInput {
  const priceEuros = form.priceEuros.trim()
  const totalAmount = form.totalAmount.trim()
  const slug = form.slug.trim()
  return {
    name: form.name.trim(),
    slug: slug === '' ? undefined : slug,
    brand: form.brand.trim(),
    category: form.category,
    kind: form.kind.trim(),
    unit: form.unit.trim() as ProductUnit,
    priceCents: priceEuros === '' ? undefined : Math.round(parseFloat(priceEuros) * 100),
    totalAmount: totalAmount === '' ? undefined : parseInt(totalAmount, 10),
    amountUnit: form.amountUnit.trim() ? (form.amountUnit.trim() as ProductAmountUnit) : undefined,
    texture: form.texture.trim() ? (form.texture.trim() as ProductTexture) : undefined,
    inci: form.inci.trim() || undefined,
    description: form.description.trim() || undefined,
    notes: form.notes.trim() || undefined,
    url: form.url.trim() || undefined,
    imageUrl: form.imageUrl.trim() || undefined,
  }
}

// Wire format for PATCH /api/products/:id.
// Empty on a nullable field that previously held a value → null (clear it).
// Empty on a field that was already empty → undefined (omit, no-op).
export function productEditFormToUpdateInput(
  form: ProductEditFormInput,
  original: ProductDetail
): UpdateProductInput {
  const clearOrOmit = <T>(trimmed: string, value: T | null, originalValue: unknown) => {
    if (trimmed !== '') return value
    return originalValue != null ? null : undefined
  }
  const priceEuros = form.priceEuros.trim()
  const totalAmount = form.totalAmount.trim()
  // Send slug only when it actually changed — backend never auto-regenerates
  // from name (Phase 7-2), so omitting keeps the URL stable.
  const slug = form.slug.trim()
  return {
    name: form.name.trim(),
    slug: slug !== '' && slug !== original.slug ? slug : undefined,
    brand: form.brand.trim(),
    category: form.category,
    kind: form.kind.trim(),
    unit: form.unit.trim() as ProductUnit,
    priceCents: clearOrOmit(
      priceEuros,
      priceEuros === '' ? null : Math.round(parseFloat(priceEuros) * 100),
      original.priceCents
    ),
    totalAmount: clearOrOmit(
      totalAmount,
      totalAmount === '' ? null : parseInt(totalAmount, 10),
      original.totalAmount
    ),
    amountUnit: clearOrOmit(
      form.amountUnit.trim(),
      form.amountUnit.trim() as ProductAmountUnit,
      original.amountUnit
    ),
    texture: clearOrOmit(
      form.texture.trim(),
      form.texture.trim() as ProductTexture,
      original.texture
    ),
    inci: clearOrOmit(form.inci.trim(), form.inci.trim(), original.inci),
    description: clearOrOmit(
      form.description.trim(),
      form.description.trim(),
      original.description
    ),
    notes: clearOrOmit(form.notes.trim(), form.notes.trim(), original.notes),
    url: clearOrOmit(form.url.trim(), form.url.trim(), original.url),
    imageUrl: clearOrOmit(form.imageUrl.trim(), form.imageUrl.trim(), original.imageUrl),
  }
}
