import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, getRouteApi, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/component/Button/Button'
import { ThreadDetail } from '@/features/discussions/components/ThreadDetail'
import { IngredientThreadSkeleton } from '@/features/ingredients/components/skeletons/IngredientLayoutSkeleton'
import { discussionQueries } from '@/lib/queries/discussions'
import { useAuthStore } from '@/store/auth'

const route = getRouteApi('/ingredients/$slug/discussions/$threadId')

function IngredientThreadDetail() {
  const { slug, threadId } = route.useParams()
  const { data: thread } = useSuspenseQuery(discussionQueries.thread('ingredient', slug, threadId))
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => navigate({ to: '/ingredients/$slug/discussions', params: { slug } })}
        style={{ marginBottom: 'var(--space-2)' }}
      >
        <ArrowLeft size={14} />
        Retour aux discussions
      </Button>
      <ThreadDetail
        thread={thread}
        entityType="ingredient"
        slug={slug}
        currentUserId={user?.id ?? null}
      />
    </>
  )
}

export const Route = createFileRoute('/ingredients/$slug/discussions/$threadId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      discussionQueries.thread('ingredient', params.slug, params.threadId)
    ),
  pendingComponent: IngredientThreadSkeleton,
  component: IngredientThreadDetail,
})
