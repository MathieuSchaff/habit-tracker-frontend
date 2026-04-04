import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'

import { ThreadList } from '@/features/discussions/components/ThreadList'
import { IngredientDiscussionSkeleton } from '@/features/ingredients/components/skeletons/IngredientLayoutSkeleton'
import { discussionQueries } from '@/lib/queries/discussions'
import { useAuthStore } from '@/store/auth'

const route = getRouteApi('/ingredients/$slug/discussions/')

function IngredientDiscussionIndex() {
  const { slug } = route.useParams()
  const { data: threads } = useSuspenseQuery(discussionQueries.threads('ingredient', slug))
  const user = useAuthStore((s) => s.user)

  return (
    <ThreadList
      threads={threads}
      entityType="ingredient"
      slug={slug}
      isLoggedIn={user !== null}
      threadDetailPath={(threadId) => `/ingredients/${slug}/discussions/${threadId}`}
    />
  )
}

export const Route = createFileRoute('/ingredients/$slug/discussions/')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(discussionQueries.threads('ingredient', params.slug)),
  pendingComponent: () => <IngredientDiscussionSkeleton />,
  component: IngredientDiscussionIndex,
})
