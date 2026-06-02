import { createFileRoute } from '@tanstack/react-router'

import { IngredientCreatePage } from '../../../features/ingredients/page/IngredientCreatePage/IngredientCreatePage'

// name prefills the form when resubmitting after a takedown (SubmissionsDashboard).
type IngredientNewSearch = { name?: string }

export const Route = createFileRoute('/_authenticated/ingredients/new')({
  validateSearch: (search: Record<string, unknown>): IngredientNewSearch => ({
    name: typeof search.name === 'string' ? search.name : undefined,
  }),
  component: IngredientCreatePage,
})
