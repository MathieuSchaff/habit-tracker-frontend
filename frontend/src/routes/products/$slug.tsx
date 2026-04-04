import { createFileRoute } from '@tanstack/react-router'

import { ProductLayout } from '@/features/products/components/ProductLayout'
import { ProductLayoutSkeleton } from '@/features/products/components/skeletons/ProductLayoutSkeleton'
import { productQueries } from '@/lib/queries/products'

export const Route = createFileRoute('/products/$slug')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(productQueries.bySlug(params.slug)),
  errorComponent: () => <div>Produit introuvable</div>,
  pendingComponent: ProductLayoutSkeleton,
  component: ProductLayout,
})
