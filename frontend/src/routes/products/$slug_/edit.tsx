import { createFileRoute } from '@tanstack/react-router'

import { ProductEditPage } from '@/features/products/components/ProductEditPage'
import { ProductInfoSkeleton } from '@/features/products/components/skeletons/ProductLayoutSkeleton'
import { requireAuth } from '@/lib/auth/requireAuth'
import { productQueries } from '@/lib/queries/products'

// Cannot move under /_authenticated: must stay under /products/$slug to render inside ProductLayout's Outlet
export const Route = createFileRoute('/products/$slug/edit')({
  beforeLoad: async ({ context, location }) => {
    await requireAuth({ queryClient: context.queryClient, pathname: location.pathname, accessToken: context.auth.accessToken })
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(productQueries.bySlug(params.slug)),
  pendingComponent: ProductInfoSkeleton,
  component: ProductEditPage,
})
