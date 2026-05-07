import type { FormErrorMap } from '@/lib/helpers/apiError'

// `ingredient_update_conflict` (409 optimistic lock) is intentionally NOT
// mapped here — IngredientForm catches it before reaching extractFormError
// and runs its own draft-recovery flow.
export type IngredientFormField = 'name' | 'slug'

export const INGREDIENT_FORM_ERRORS: FormErrorMap<IngredientFormField> = {
  slug_already_exists: {
    field: 'slug',
    message: 'Ce slug est déjà utilisé par un autre ingrédient.',
  },
  ingredient_already_exists: {
    field: 'name',
    message: 'Un ingrédient avec ce nom existe déjà.',
  },
  unauthorized_access: {
    message: "Tu n'as pas le droit de modifier cet ingrédient.",
  },
}
