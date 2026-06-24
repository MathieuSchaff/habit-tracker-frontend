import '../discussions.css'

import type { DiscussionThread } from '@aurore/shared'

import { Link } from '@tanstack/react-router'
import { MessageSquare } from 'lucide-react'

import { EmptyState } from '@/component/Feedback/ui/EmptyState/EmptyState'
import { AuthorLine } from './AuthorLine'
import { ThreadForm } from './ThreadForm'

interface ThreadListProps {
  threads: DiscussionThread[]
  entityType: 'product' | 'ingredient'
  slug: string
  isLoggedIn: boolean
}

export function ThreadList({ threads, entityType, slug, isLoggedIn }: ThreadListProps) {
  return (
    <div className="discussions-section">
      {isLoggedIn && <ThreadForm entityType={entityType} slug={slug} />}
      {threads.length === 0 ? (
        <EmptyState subtitle="Aucune discussion pour l'instant." />
      ) : (
        <div className="thread-list">
          {threads.map((thread) => {
            const content = (
              <>
                <p className="thread-item__title">{thread.title}</p>
                <div className="thread-item__meta">
                  <AuthorLine
                    authorId={thread.authorId}
                    authorName={thread.authorName}
                    createdAt={thread.createdAt}
                  />
                  <span className="thread-item__replies">
                    <MessageSquare size={12} />
                    {thread.replyCount}
                  </span>
                </div>
              </>
            )
            return entityType === 'product' ? (
              <Link
                key={thread.id}
                to="/products/$slug/discussions/$threadId"
                params={{ slug, threadId: thread.id }}
                className="thread-item"
              >
                {content}
              </Link>
            ) : (
              <Link
                key={thread.id}
                to="/ingredients/$slug/discussions/$threadId"
                params={{ slug, threadId: thread.id }}
                className="thread-item"
              >
                {content}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
