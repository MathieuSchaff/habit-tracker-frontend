import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'

import { ingredientsSearchDefaults, ingredientsSearchSchema } from '@/features/ingredients/filters'
import { IngredientsPage } from '../../features/ingredients/page/IngredientsPage/IngredientsPage'

export const Route = createFileRoute('/ingredients/')({
  validateSearch: zodValidator(ingredientsSearchSchema),
  search: {
    middlewares: [stripSearchParams(ingredientsSearchDefaults)],
  },
  component: IngredientsPage,
})
