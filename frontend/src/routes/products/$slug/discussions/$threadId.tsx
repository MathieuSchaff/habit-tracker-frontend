import { createFileRoute, getRouteApi } from '@tanstack/react-router'

import { ThreadDetailPage } from '@/features/discussions/pages/ThreadDetailPage'
import { ProductThreadSkeleton } from '@/features/products/components/skeletons/ProductLayoutSkeleton'
import { discussionQueries } from '@/lib/queries/discussions'

const route = getRouteApi('/products/$slug/discussions/$threadId')

function ProductThreadDetailRoute() {
  const { slug, threadId } = route.useParams()
  return (
    <ThreadDetailPage
      entityType="product"
      slug={slug}
      threadId={threadId}
      backTo="/products/$slug/discussions"
    />
  )
}

export const Route = createFileRoute('/products/$slug/discussions/$threadId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      discussionQueries.thread('product', params.slug, params.threadId)
    ),
  pendingComponent: ProductThreadSkeleton,
  component: ProductThreadDetailRoute,
})
