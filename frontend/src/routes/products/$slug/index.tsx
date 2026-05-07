import { createFileRoute } from '@tanstack/react-router'

import { GlobalError } from '@/component/Feedback/app/GlobalError/GlobalError'
import { ProductInfoSkeleton } from '@/features/products/components/skeletons/ProductLayoutSkeleton/ProductLayoutSkeleton'
import { ProductInfoTab } from '@/features/products/pages/ProductInfoTab/ProductInfoTab'
import { productQueries } from '@/lib/queries/products'

export const Route = createFileRoute('/products/$slug/')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(productQueries.bySlug(params.slug)),
  pendingComponent: ProductInfoSkeleton,
  errorComponent: ({ error, reset }) => <GlobalError error={error} reset={reset} is404 />,
  component: ProductInfoTab,
})
