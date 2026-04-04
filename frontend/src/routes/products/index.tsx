import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'

import { filterSearchSchema } from '@/component/Filter/helpers'
import { ProductsPage } from '../../features/products/components/ProductsPage'
import { FILTER_KEYS } from '../../features/products/filters'

const { schema, defaultValues } = filterSearchSchema(FILTER_KEYS)

export const Route = createFileRoute('/products/')({
  validateSearch: zodValidator(schema),
  search: {
    middlewares: [stripSearchParams(defaultValues)],
  },
  component: ProductsPage,
})
