import { createFileRoute, stripSearchParams } from '@tanstack/react-router'

import { productsSearchDefaults, productsSearchSchema } from '@/features/products/filters'
import { deriveAvoidFor, productsListApiFilters } from '@/features/products/helpers'
import { ProductsPage } from '@/features/products/pages/ProductsPage/ProductsPage'
import { awaitBootRefresh } from '@/lib/auth/awaitBootRefresh'
import { convergeShelfStatusForList, productQueries } from '@/lib/queries/products'
import { profileQueries } from '@/lib/queries/profile'
import { useAuthStore } from '@/store/auth'

export const Route = createFileRoute('/products/')({
  validateSearch: productsSearchSchema,
  search: {
    middlewares: [stripSearchParams(productsSearchDefaults)],
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    // Join the root boot probe on cold authenticated sessions. This scopes product
    // data work to /products while still letting anonymous visitors fetch immediately.
    await awaitBootRefresh(context.queryClient)

    const userId = useAuthStore.getState().user?.id ?? null
    let dermo = context.queryClient.getQueryData(profileQueries.dermo().queryKey)

    if (userId) {
      if (deps.profile_filter) {
        // A failed dermo fetch must not blank the whole catalogue for a personalization
        // filter: fall back to the cached profile (or none) and let the list render.
        // deriveAvoidFor tolerates null/undefined → no exclusions.
        dermo = await context.queryClient.ensureQueryData(profileQueries.dermo()).catch(() => dermo)
      } else {
        void context.queryClient.prefetchQuery(profileQueries.dermo())
      }
    }

    const avoidFor = deriveAvoidFor(dermo, deps.profile_filter)
    const filters = productsListApiFilters(deps, avoidFor)

    if (userId) {
      void convergeShelfStatusForList(context.queryClient, filters, userId)
      return
    }

    void context.queryClient.prefetchQuery(productQueries.list(filters, null))
  },
  component: ProductsPage,
})
