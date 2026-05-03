import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'

import { productsSearchDefaults, productsSearchSchema } from '@/features/products/filters'
import { ProductsPage } from '@/features/products/pages/ProductsPage/ProductsPage'
import { profileQueries } from '@/lib/queries/profile'

export const Route = createFileRoute('/products/')({
  validateSearch: zodValidator(productsSearchSchema),
  search: {
    middlewares: [stripSearchParams(productsSearchDefaults)],
  },
  loader: ({ context }) => {
    if (context.auth.isAuthenticated) {
      void context.queryClient.prefetchQuery(profileQueries.dermo())
    }
  },
  component: ProductsPage,
})
