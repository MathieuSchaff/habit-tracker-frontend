import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'

import { productsSearchDefaults, productsSearchSchema } from '@/features/products/filters'
import { productsListApiFilters } from '@/features/products/helpers'
import { ProductsPage } from '@/features/products/pages/ProductsPage/ProductsPage'
import { productQueries } from '@/lib/queries/products'
import { profileQueries } from '@/lib/queries/profile'
import { useAuthStore } from '@/store/auth'

export const Route = createFileRoute('/products/')({
  validateSearch: zodValidator(productsSearchSchema),
  search: {
    middlewares: [stripSearchParams(productsSearchDefaults)],
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    if (context.auth.isAuthenticated) {
      void context.queryClient.prefetchQuery(profileQueries.dermo())
    }
    // Start the list fetch during nav so it overlaps the ProductsPage chunk download.
    // avoidFor:[] matches the component's first render (before dermo resolves); userKey
    // from the store so the prefetched key matches the authenticated query.
    const userKey = useAuthStore.getState().user?.id ?? null
    void context.queryClient.prefetchQuery(
      productQueries.list(productsListApiFilters(deps, []), userKey)
    )
  },
  component: ProductsPage,
})
