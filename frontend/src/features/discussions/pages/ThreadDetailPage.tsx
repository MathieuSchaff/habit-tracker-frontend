import { useSuspenseQuery } from '@tanstack/react-query'

import { BackButton } from '@/component/Button/BackButton'
import { discussionQueries } from '@/lib/queries/discussions'
import { useAuthStore } from '@/store/auth'
import { ThreadDetail } from '../components/ThreadDetail'

interface ThreadDetailPageProps {
  entityType: 'product' | 'ingredient'
  slug: string
  threadId: string
  backTo: string
}

export function ThreadDetailPage({ entityType, slug, threadId, backTo }: ThreadDetailPageProps) {
  const { data: thread } = useSuspenseQuery(discussionQueries.thread(entityType, slug, threadId))
  const user = useAuthStore((s) => s.user)

  return (
    <>
      <BackButton to={backTo} params={{ slug }}>
        Retour aux discussions
      </BackButton>
      <ThreadDetail
        thread={thread}
        entityType={entityType}
        slug={slug}
        currentUserId={user?.id ?? null}
      />
    </>
  )
}
