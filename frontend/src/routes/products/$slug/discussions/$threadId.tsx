import { createFileRoute, getRouteApi, notFound } from '@tanstack/react-router'

import { GlobalError } from '@/component/Feedback/app/GlobalError/GlobalError'
import { ThreadDetailPage } from '@/features/discussions/pages/ThreadDetailPage'
import { ProductThreadSkeleton } from '@/features/products/components/skeletons/ProductLayoutSkeleton/ProductLayoutSkeleton'
import { ApiError } from '@/lib/helpers/apiError'
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

// No routing-level auth guard: threads are public (read). Write actions (post/reply)
// are gated by the backend - frontend shows UI conditionally via useAuthStore.
export const Route = createFileRoute('/products/$slug/discussions/$threadId')({
  loader: ({ context, params }) =>
    context.queryClient
      .ensureQueryData(discussionQueries.thread('product', params.slug, params.threadId))
      .catch((err) => {
        // Missing thread = 404 → notFoundComponent; keep 5xx/429 on the real error UI.
        if (err instanceof ApiError && err.status === 404) throw notFound()
        throw err
      }),
  pendingComponent: ProductThreadSkeleton,
  notFoundComponent: () => <GlobalError error={new Error('not_found')} is404 />,
  errorComponent: ({ error, reset }) => <GlobalError error={error} reset={reset} />,
  component: ProductThreadDetailRoute,
})
