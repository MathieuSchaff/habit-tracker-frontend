import { createFileRoute } from '@tanstack/react-router'

import { IngredientCreatePage } from '../../../features/ingredients/page/IngredientCreatePage/IngredientCreatePage'

export const Route = createFileRoute('/_authenticated/ingredients/new')({
  component: IngredientCreatePage,
})
