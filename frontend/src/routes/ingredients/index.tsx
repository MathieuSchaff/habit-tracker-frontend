import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'

import { filterSearchSchema } from '@/component/Filter'
import { IngredientsPage } from '../../features/ingredients/components/IngredientsPage'
import { FILTER_KEYS } from '../../features/ingredients/filters'

const { schema, defaultValues } = filterSearchSchema(FILTER_KEYS)

export const Route = createFileRoute('/ingredients/')({
  validateSearch: zodValidator(schema),
  search: {
    middlewares: [stripSearchParams(defaultValues)],
  },
  component: IngredientsPage,
})
