import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'

import { productsSearchDefaults, productsSearchSchema } from '@/features/products/filters'
import { deriveAvoidFor, productsListApiFilters } from '@/features/products/helpers'
import { ProductsPage } from '@/features/products/pages/ProductsPage/ProductsPage'
import { awaitBootRefresh } from '@/lib/auth/awaitBootRefresh'
import { convergeShelfStatusForList, productQueries } from '@/lib/queries/products'
import { profileQueries } from '@/lib/queries/profile'
import { useAuthStore } from '@/store/auth'

export const Route = createFileRoute('/products/')({
  validateSearch: zodValidator(productsSearchSchema),
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
        dermo = await context.queryClient.ensureQueryData(profileQueries.dermo())
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
