import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'

import { productsSearchDefaults, productsSearchSchema } from '@/features/products/filters'
import { ProductsPage } from '@/features/products/pages/ProductsPage/ProductsPage'

export const Route = createFileRoute('/products/')({
  validateSearch: zodValidator(productsSearchSchema),
  search: {
    middlewares: [stripSearchParams(productsSearchDefaults)],
  },
  component: ProductsPage,
})
