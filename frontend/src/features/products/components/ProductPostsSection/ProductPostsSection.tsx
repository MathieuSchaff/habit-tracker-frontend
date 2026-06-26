import type { SocialPostSurfaceView } from '@aurore/shared'

import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import { Badge } from '@/component/DataDisplay/Badge/Badge'
import { Time } from '@/component/DataDisplay/Time/Time'
import { SectionHeader } from '@/component/Typography/SectionHeader/SectionHeader'
import { POST_TONE_LABELS } from '@/constants/skin'
import { ReactionRow } from '@/features/social/components/ReactionRow/ReactionRow'
import { productQueries } from '@/lib/queries/products'

import './ProductPostsSection.css'

// Author link only when the profile is public (ReviewerName pattern).
function AuthorName({ author }: { author: SocialPostSurfaceView['author'] }) {
  if (author.profilePublic) {
    return (
      <Link
        className="product-posts__author-link"
        to="/u/$username"
        params={{ username: author.username }}
      >
        {author.username}
      </Link>
    )
  }
  return <span className="product-posts__author-name">{author.username}</span>
}

// Deliberate posts anchored to this product (#7/T5). The product is implicit here,
// so we show author + tone + content, not the product anchor. Self-hides when empty
// (calme: no empty box on the many products that have no posts yet). No counters,
// no sort-by-reaction — newest first, server-side.
export function ProductPostsSection({ slug }: { slug: string }) {
  const { data } = useQuery(productQueries.posts(slug))
  const posts = data?.posts ?? []

  if (posts.length === 0) return null

  return (
    <section className="product-section product-posts">
      <SectionHeader title="Publications" variant="primary" />
      <ul role="list" className="product-posts__list">
        {posts.map((post) => (
          <li key={post.id} className="product-posts__item">
            <header className="product-posts__header">
              <AuthorName author={post.author} />
              <Time iso={post.createdAt} style="monthYear" className="product-posts__date" />
              <Badge variant="chip">{POST_TONE_LABELS[post.tone]}</Badge>
            </header>
            <p className="product-posts__body">{post.content}</p>
            <ReactionRow reactableType="post" reactableId={post.id} />
          </li>
        ))}
      </ul>
    </section>
  )
}
