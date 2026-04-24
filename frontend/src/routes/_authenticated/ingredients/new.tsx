import { createFileRoute } from '@tanstack/react-router'

import { IngredientCreatePage } from '../../../features/ingredients/components/IngredientCreatePage'

export const Route = createFileRoute('/_authenticated/ingredients/new')({
  component: IngredientCreatePage,
})
