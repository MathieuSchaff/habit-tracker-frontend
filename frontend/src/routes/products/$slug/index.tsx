import { createFileRoute } from '@tanstack/react-router'

import { ProductInfoTab } from '@/features/products/components/ProductPage'
import { ProductInfoSkeleton } from '@/features/products/components/skeletons/ProductLayoutSkeleton'
import { productQueries } from '@/lib/queries/products'

export const Route = createFileRoute('/products/$slug/')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(productQueries.bySlug(params.slug)),
  pendingComponent: ProductInfoSkeleton,
  component: ProductInfoTab,
})
