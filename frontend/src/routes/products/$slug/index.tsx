import { createFileRoute, notFound } from '@tanstack/react-router'

import { GlobalError } from '@/component/Feedback/app/GlobalError/GlobalError'
import { ProductInfoSkeleton } from '@/features/products/components/skeletons/ProductLayoutSkeleton/ProductLayoutSkeleton'
import { ProductInfoTab } from '@/features/products/pages/ProductInfoTab/ProductInfoTab'
import { ApiError } from '@/lib/helpers/apiError'
import { productQueries } from '@/lib/queries/products'

export const Route = createFileRoute('/products/$slug/')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(productQueries.bySlug(params.slug)).catch((err) => {
      // Missing product = 404 → notFoundComponent; keep 5xx/429 on the real error UI.
      if (err instanceof ApiError && err.status === 404) throw notFound()
      throw err
    }),
  pendingComponent: ProductInfoSkeleton,
  notFoundComponent: () => <GlobalError error={new Error('not_found')} is404 />,
  errorComponent: ({ error, reset }) => <GlobalError error={error} reset={reset} />,
  component: ProductInfoTab,
})
