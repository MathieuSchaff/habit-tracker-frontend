import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

import { GlobalError } from '@/component/Feedback/app/GlobalError/GlobalError'
import { ThreadList } from '@/features/discussions/components/ThreadList'
import { PostComposer } from '@/features/products/components/PostComposer/PostComposer'
import { ProductPostsSection } from '@/features/products/components/ProductPostsSection/ProductPostsSection'
import { PublicReviewsSection } from '@/features/products/components/PublicReviewsSection/PublicReviewsSection'
import { ProductDiscussionSkeleton } from '@/features/products/components/skeletons/ProductLayoutSkeleton/ProductLayoutSkeleton'
import { discussionQueries } from '@/lib/queries/discussions'
import { productQueries } from '@/lib/queries/products'
import { useAuthStore } from '@/store/auth'

const route = getRouteApi('/products/$slug/discussions/')

function ProductDiscussionIndex() {
  const { slug } = route.useParams()
  // Cached by the parent /products/$slug loader; reads without a waterfall.
  const { data: product } = useSuspenseQuery(productQueries.bySlug(slug))
  const { data: threads } = useSuspenseQuery(discussionQueries.threads('product', slug))
  const user = useAuthStore((s) => s.user)

  return (
    <>
      <PublicReviewsSection slug={slug} />

      {user && (
        <div className="product-section">
          <PostComposer productId={product.id} slug={slug} />
        </div>
      )}
      <ProductPostsSection slug={slug} />

      <ThreadList threads={threads} entityType="product" slug={slug} isLoggedIn={user !== null} />
    </>
  )
}

export const Route = createFileRoute('/products/$slug/discussions/')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(discussionQueries.threads('product', params.slug)),
  pendingComponent: () => <ProductDiscussionSkeleton />,
  errorComponent: ({ error, reset }) => <GlobalError error={error} reset={reset} />,
  component: ProductDiscussionIndex,
})
