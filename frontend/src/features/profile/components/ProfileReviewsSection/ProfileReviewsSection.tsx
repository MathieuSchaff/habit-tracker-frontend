import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import { profileQueries } from '@/lib/queries/profile'
import './ProfileReviewsSection.css'

// Layer ③ of the porte-produits profile (#7/T4): a recent, capped sample of the
// person's public reviews — the product is explicit here. Renders nothing when
// empty (clean absence, never a broken placeholder). Non-blocking (useQuery), so
// it never delays the profile's skin section.
export function ProfileReviewsSection({ username }: { username: string }) {
  const { data } = useQuery(profileQueries.reviewsByUsername(username))
  const reviews = data?.reviews ?? []

  if (reviews.length === 0) return null

  return (
    <section className="public-profile__section">
      <h2 className="public-profile__section-title">Avis récents</h2>
      <ul className="profile-reviews">
        {reviews.map((review) => (
          <li key={review.id} className="profile-reviews__item">
            <Link
              className="profile-reviews__product"
              to="/products/$slug"
              params={{ slug: review.product.slug }}
            >
              {review.product.name}
            </Link>
            {review.comment && <p className="profile-reviews__comment">{review.comment}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}
