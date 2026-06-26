import { Link } from '@tanstack/react-router'

import { Badge } from '@/component/DataDisplay/Badge/Badge'
import { Time } from '@/component/DataDisplay/Time/Time'
import { POST_TONE_LABELS, SIMILARITY_BAND_LABELS, SKIN_CONCERN_LABELS } from '@/constants/skin'
import { ReactionRow } from '@/features/social/components/ReactionRow/ReactionRow'
import type { FeedItem } from '@/lib/queries/social'

import './FeedPostCard.css'

// Author link only when the profile is public (ReviewerName pattern). Feed authors
// are all discoverable+public by source, but the gate stays for safety/consistency.
function AuthorName({ author }: { author: FeedItem['author'] }) {
  if (author.profilePublic) {
    return (
      <Link
        className="feed-card__author-link"
        to="/u/$username"
        params={{ username: author.username }}
      >
        {author.username}
      </Link>
    )
  }
  return <span className="feed-card__author-name">{author.username}</span>
}

// Anchors as calm, linked refs — what the post is about. The feed is cross-anchor,
// so unlike the product surface we show them. Concern is a facet (no link).
function PostAnchors({ post }: { post: FeedItem }) {
  const concernLabel = post.concernSlug ? SKIN_CONCERN_LABELS[post.concernSlug] : null
  if (!post.productAnchor && !post.ingredientAnchor && !concernLabel) return null
  return (
    <div className="feed-card__anchors">
      {post.productAnchor && (
        <Link
          className="feed-card__anchor"
          to="/products/$slug"
          params={{ slug: post.productAnchor.slug }}
        >
          {post.productAnchor.name}
        </Link>
      )}
      {post.ingredientAnchor && (
        <Link
          className="feed-card__anchor"
          to="/ingredients/$slug"
          params={{ slug: post.ingredientAnchor.slug }}
        >
          {post.ingredientAnchor.name}
        </Link>
      )}
      {concernLabel && (
        <span className="feed-card__anchor feed-card__anchor--concern">{concernLabel}</span>
      )}
    </div>
  )
}

// One post in the feed: author + closeness band + tone + anchors + content + entraide
// reactions. The band reinforces "people like me"; it is the ordinal label, never a
// score (#1). No counters, no sort-by-reaction.
export function FeedPostCard({ post }: { post: FeedItem }) {
  const bandLabel = SIMILARITY_BAND_LABELS[post.authorBand]
  return (
    <li className="feed-card">
      <div className="feed-card__header">
        <AuthorName author={post.author} />
        {bandLabel && <Badge variant="primary">{bandLabel}</Badge>}
        <Time iso={post.createdAt} style="monthYear" className="feed-card__date" />
        <Badge variant="chip">{POST_TONE_LABELS[post.tone]}</Badge>
      </div>
      <PostAnchors post={post} />
      <p className="feed-card__body">{post.content}</p>
      <ReactionRow reactableType="post" reactableId={post.id} />
    </li>
  )
}
