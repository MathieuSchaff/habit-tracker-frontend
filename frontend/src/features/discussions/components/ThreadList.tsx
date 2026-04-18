import '../discussions.css'

import type { DiscussionThread } from '@habit-tracker/shared'

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
  threadDetailPath: (threadId: string) => string
}

export function ThreadList({
  threads,
  entityType,
  slug,
  isLoggedIn,
  threadDetailPath,
}: ThreadListProps) {
  return (
    <div className="discussions-section">
      {isLoggedIn && <ThreadForm entityType={entityType} slug={slug} />}
      {threads.length === 0 ? (
        <EmptyState subtitle="Aucune discussion pour l'instant." />
      ) : (
        <div className="thread-list">
          {threads.map((thread) => (
            <Link key={thread.id} to={threadDetailPath(thread.id) as never} className="thread-item">
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
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
