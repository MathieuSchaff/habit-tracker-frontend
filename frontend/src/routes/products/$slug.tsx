import { createFileRoute } from '@tanstack/react-router'

import { GlobalError } from '@/component/Feedback/app/GlobalError/GlobalError'
import { ProductLayoutSkeleton } from '@/features/products/components/skeletons/ProductLayoutSkeleton/ProductLayoutSkeleton'
import { ProductLayout } from '@/features/products/pages/ProductLayout/ProductLayout'
import { productQueries } from '@/lib/queries/products'

export const Route = createFileRoute('/products/$slug')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(productQueries.bySlug(params.slug)),
  errorComponent: ({ error, reset }) => <GlobalError error={error} reset={reset} is404 />,
  pendingComponent: ProductLayoutSkeleton,
  component: ProductLayout,
})
