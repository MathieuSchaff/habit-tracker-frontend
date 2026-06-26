import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import { Badge } from '@/component/DataDisplay/Badge/Badge'
import { Time } from '@/component/DataDisplay/Time/Time'
import { POST_TONE_LABELS, SKIN_CONCERN_LABELS } from '@/constants/skin'
import { ReactionRow } from '@/features/social/components/ReactionRow/ReactionRow'
import { profileQueries } from '@/lib/queries/profile'
import './ProfilePostsSection.css'

// Layer ③ of the porte-produits profile (#7/T5): a recent, capped sample of the
// person's deliberate posts — anchored to a product/ingredient/concern so the
// reader leaves on the thing. Renders nothing when empty (clean absence).
// Non-blocking (useQuery), so it never delays the profile's skin section.
export function ProfilePostsSection({ username }: { username: string }) {
  const { data } = useQuery(profileQueries.postsByUsername(username))
  const posts = data?.posts ?? []

  if (posts.length === 0) return null

  return (
    <section className="public-profile__section">
      <h2 className="public-profile__section-title">Publications récentes</h2>
      <ul role="list" className="profile-posts">
        {posts.map((post) => (
          <li key={post.id} className="profile-posts__item">
            <p className="profile-posts__content">{post.content}</p>
            <div className="profile-posts__anchors">
              <Badge variant="chip">{POST_TONE_LABELS[post.tone]}</Badge>
              <Time iso={post.createdAt} style="monthYear" className="profile-posts__date" />

              {post.productAnchor && (
                <Link
                  className="profile-posts__anchor"
                  to="/products/$slug"
                  params={{ slug: post.productAnchor.slug }}
                >
                  {post.productAnchor.name}
                </Link>
              )}
              {post.ingredientAnchor && (
                <Link
                  className="profile-posts__anchor"
                  to="/ingredients/$slug"
                  params={{ slug: post.ingredientAnchor.slug }}
                >
                  {post.ingredientAnchor.name}
                </Link>
              )}
              {post.concernSlug && (
                <span className="profile-posts__concern">
                  {SKIN_CONCERN_LABELS[post.concernSlug] ?? post.concernSlug}
                </span>
              )}
            </div>
            <ReactionRow reactableType="post" reactableId={post.id} />
          </li>
        ))}
      </ul>
    </section>
  )
}
