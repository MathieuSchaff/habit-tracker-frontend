import { createFileRoute } from '@tanstack/react-router'

import { GlobalError } from '@/component/Feedback/app/GlobalError/GlobalError'
import { ProductLayoutSkeleton } from '@/features/products/components/skeletons/ProductLayoutSkeleton/ProductLayoutSkeleton'
import { ProductLayout } from '@/features/products/pages/ProductLayout/ProductLayout'
import { productQueries } from '@/lib/queries/products'
import { profileQueries } from '@/lib/queries/profile'

export const Route = createFileRoute('/products/$slug')({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(productQueries.bySlug(params.slug)),
      // Non-critical: dermo only feeds the warnings strip in InfoTab.
      // Swallow so a profile fetch failure never blocks the product page.
      context.auth.isAuthenticated
        ? context.queryClient.ensureQueryData(profileQueries.dermo()).catch(() => null)
        : null,
    ]),
  errorComponent: ({ error, reset }) => <GlobalError error={error} reset={reset} is404 />,
  pendingComponent: ProductLayoutSkeleton,
  component: ProductLayout,
})
