import { createFileRoute } from '@tanstack/react-router'

import { ProductInfoSkeleton } from '@/features/products/components/skeletons/ProductLayoutSkeleton/ProductLayoutSkeleton'
import { ProductEditPage } from '@/features/products/pages/ProductEditPage/ProductEditPage'
import { requireAuth } from '@/lib/auth/requireAuth'
import { productQueries } from '@/lib/queries/products'

// Trailing `_` on $slug_ opts this route out of $slug.tsx (ProductLayout) so
// the edit page does not inherit the parent's hero/tabs/top actions.
export const Route = createFileRoute('/products/$slug_/edit')({
  beforeLoad: async ({ context, location }) => {
    await requireAuth({
      queryClient: context.queryClient,
      pathname: location.pathname,
      accessToken: context.auth.accessToken,
    })
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(productQueries.bySlug(params.slug)),
  pendingComponent: ProductInfoSkeleton,
  component: ProductEditPage,
})
