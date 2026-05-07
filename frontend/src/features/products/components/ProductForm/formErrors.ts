import type { FormErrorMap } from '@/lib/helpers/apiError'

// Backend → user message + form field to highlight. Codes come from
// `productErrorMapping` in shared/products/helpers.ts. Codes that already
// surface via toast (creation_failed, update_failed) stay unmapped — they
// fall back to the toast and the generic form message.
export type ProductFormField = 'name' | 'brand' | 'kind' | 'tags'

export const PRODUCT_FORM_ERRORS: FormErrorMap<ProductFormField> = {
  product_already_exists: {
    field: 'name',
    message: 'Un produit avec ce nom et cette marque existe déjà.',
  },
  tag_domain_mismatch: {
    field: 'tags',
    message: "Certains tags ne correspondent pas au domaine du produit.",
  },
  unauthorized_access: {
    message: "Tu n'as pas le droit de modifier ce produit.",
  },
}
