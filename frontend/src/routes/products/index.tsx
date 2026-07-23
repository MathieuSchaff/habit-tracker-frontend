import { createFileRoute, stripSearchParams } from '@tanstack/react-router'

import { productsSearchDefaults, productsSearchSchema } from '@/features/products/filters'
import { deriveAvoidFor, productsListApiFilters } from '@/features/products/helpers'
import { ProductsPage } from '@/features/products/pages/ProductsPage/ProductsPage'
import { awaitBootRefresh } from '@/lib/auth/awaitBootRefresh'
import { isServer } from '@/lib/helpers/isServer'
import { convergeShelfStatusForList, productQueries } from '@/lib/queries/products'
import { resolveDermoForList } from '@/lib/queries/profile'
import { seoHead } from '@/lib/seo'
import { useAuthStore } from '@/store/auth'

export const Route = createFileRoute('/products/')({
  // SSR the hub so the bare path ships index,follow + canonical in the server HTML
  // instead of inheriting the root's noindex until hydration. Filtered variants
  // stay on the same route and consolidate to this canonical.
  ssr: true,
  validateSearch: productsSearchSchema,
  search: {
    middlewares: [stripSearchParams(productsSearchDefaults)],
  },
  head: () =>
    seoHead({
      path: '/products',
      title: 'Produits — Aurore',
      description:
        'Parcourez le catalogue skincare : formules, ingrédients et notes, sans score ni verdict, sur Aurore.',
    }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    // Cold authenticated sessions wait for the root boot probe; anonymous visitors
    // fetch right away. Skip on the server: hasSessionHint reads document.cookie.
    if (!isServer) await awaitBootRefresh(context.queryClient)

    const userId = useAuthStore.getState().user?.id ?? null
    const dermo = await resolveDermoForList(context.queryClient, userId, deps.profile_filter)
    const avoidFor = deriveAvoidFor(dermo, deps.profile_filter)
    const filters = productsListApiFilters(deps, avoidFor)

    if (userId) {
      void convergeShelfStatusForList(context.queryClient, filters, userId)
      return
    }

    // Wait on the server so the rendered total matches the dehydrated cache.
    // Keep client navigation non-blocking so its first render is not delayed.
    const listQuery = productQueries.list(filters, null)
    if (isServer) await context.queryClient.prefetchQuery(listQuery)
    else void context.queryClient.prefetchQuery(listQuery)
  },
  component: ProductsPage,
})
