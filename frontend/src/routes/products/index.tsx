import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'

import { productsSearchDefaults, productsSearchSchema } from '@/features/products/filters'
import { deriveAvoidFor, productsListApiFilters } from '@/features/products/helpers'
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
    // Derive avoidFor from cached dermo (if any) so the prefetched key matches the
    // component's first render even when profile_filter is on; cold dermo → [], also a
    // match. userKey from the store so the prefetched key matches the authenticated query.
    const userKey = useAuthStore.getState().user?.id ?? null
    const dermo = context.queryClient.getQueryData(profileQueries.dermo().queryKey)
    const avoidFor = deriveAvoidFor(dermo, deps.profile_filter)
    void context.queryClient.prefetchQuery(
      productQueries.list(productsListApiFilters(deps, avoidFor), userKey)
    )
  },
  component: ProductsPage,
})
