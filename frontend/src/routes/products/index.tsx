import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'

import { ProductsPage } from '../../features/products/components/ProductsPage'
import { productsSearchDefaults, productsSearchSchema } from '../../features/products/filters'

export const Route = createFileRoute('/products/')({
  validateSearch: zodValidator(productsSearchSchema),
  search: {
    middlewares: [stripSearchParams(productsSearchDefaults)],
  },
  component: ProductsPage,
})
