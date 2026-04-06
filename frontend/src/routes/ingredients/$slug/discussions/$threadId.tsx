import { createFileRoute, getRouteApi } from '@tanstack/react-router'

import { ThreadDetailPage } from '@/features/discussions/pages/ThreadDetailPage'
import { IngredientThreadSkeleton } from '@/features/ingredients/components/skeletons/IngredientLayoutSkeleton'
import { discussionQueries } from '@/lib/queries/discussions'

const route = getRouteApi('/ingredients/$slug/discussions/$threadId')

function IngredientThreadDetailRoute() {
  const { slug, threadId } = route.useParams()
  return (
    <ThreadDetailPage
      entityType="ingredient"
      slug={slug}
      threadId={threadId}
      backTo="/ingredients/$slug/discussions"
    />
  )
}

export const Route = createFileRoute('/ingredients/$slug/discussions/$threadId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      discussionQueries.thread('ingredient', params.slug, params.threadId)
    ),
  pendingComponent: IngredientThreadSkeleton,
  component: IngredientThreadDetailRoute,
})
