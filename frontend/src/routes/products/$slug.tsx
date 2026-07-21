import { createFileRoute, notFound } from '@tanstack/react-router'

import { GlobalError } from '@/component/Feedback/app/GlobalError/GlobalError'
import { ProductLayoutSkeleton } from '@/features/products/components/skeletons/ProductLayoutSkeleton/ProductLayoutSkeleton'
import { ProductLayout } from '@/features/products/pages/ProductLayout/ProductLayout'
import { ApiError } from '@/lib/helpers/apiError'
import { productQueries } from '@/lib/queries/products'
import { profileQueries } from '@/lib/queries/profile'

export const Route = createFileRoute('/products/$slug')({
  ssr: true,
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(productQueries.bySlug(params.slug)).catch((err) => {
        // A missing product is a 404, not a render error: route it to notFoundComponent
        // so 5xx/429 keep the real error UI instead of a misleading "page not found".
        if (err instanceof ApiError && err.status === 404) throw notFound()
        throw err
      }),
      // Non-critical: dermo only feeds the warnings strip in InfoTab.
      // Swallow so a profile fetch failure never blocks the product page.
      context.auth.isAuthenticated
        ? context.queryClient.ensureQueryData(profileQueries.dermo()).catch(() => null)
        : null,
    ]),
  notFoundComponent: () => <GlobalError error={new Error('not_found')} is404 />,
  errorComponent: ({ error, reset }) => <GlobalError error={error} reset={reset} />,
  pendingComponent: ProductLayoutSkeleton,
  component: ProductLayout,
})
