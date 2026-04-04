import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

import { ThreadList } from '@/features/discussions/components/ThreadList'
import { ProductDiscussionSkeleton } from '@/features/products/components/skeletons/ProductLayoutSkeleton'
import { discussionQueries } from '@/lib/queries/discussions'
import { useAuthStore } from '@/store/auth'

const route = getRouteApi('/products/$slug/discussions/')

function ProductDiscussionIndex() {
  const { slug } = route.useParams()
  const { data: threads } = useSuspenseQuery(discussionQueries.threads('product', slug))
  const user = useAuthStore((s) => s.user)

  return (
    <ThreadList
      threads={threads}
      entityType="product"
      slug={slug}
      isLoggedIn={user !== null}
      threadDetailPath={(threadId) => `/products/${slug}/discussions/${threadId}`}
    />
  )
}

export const Route = createFileRoute('/products/$slug/discussions/')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(discussionQueries.threads('product', params.slug)),
  pendingComponent: () => <ProductDiscussionSkeleton />,
  component: ProductDiscussionIndex,
})
