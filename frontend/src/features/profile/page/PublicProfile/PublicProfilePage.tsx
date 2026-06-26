import type { PublicProfileView } from '@aurore/shared'

import { useQuery, useSuspenseQuery } from '@tanstack/react-query'

import { PageTitle } from '@/component/Typography/PageTitle/PageTitle'
import { FITZPATRICK_ITEMS, SKIN_CONCERN_LABELS, SKIN_TYPE_LABELS } from '@/constants/skin'
import { profileQueries } from '@/lib/queries/profile'
import { sanitizeUrl } from '@/lib/url'
import { ProfileAvatar } from '../../components/ProfileAvatar/ProfileAvatar'
import { ProfilePostsSection } from '../../components/ProfilePostsSection/ProfilePostsSection'
import { ProfileReviewsSection } from '../../components/ProfileReviewsSection/ProfileReviewsSection'
import './PublicProfilePage.css'

type PublicProfilePageProps = {
  username: string
}

function hasAnyVisibleField(view: PublicProfileView): boolean {
  return (
    view.bio !== null ||
    view.avatarUrl !== null ||
    (view.links !== null && view.links.length > 0) ||
    (view.skinTypes !== null && view.skinTypes.length > 0) ||
    view.fitzpatrickType !== null ||
    (view.skinConcerns !== null && view.skinConcerns.length > 0)
  )
}

export function PublicProfilePage({ username }: PublicProfilePageProps) {
  const { data } = useSuspenseQuery(profileQueries.publicByUsername(username))
  // Shared (deduped) with the trail sections — only used to keep the "rien de
  // partagé" message from contradicting a populated posts/reviews trail.
  const { data: reviewsData } = useQuery(profileQueries.reviewsByUsername(username))
  const { data: postsData } = useQuery(profileQueries.postsByUsername(username))

  const fitzItem = FITZPATRICK_ITEMS.find((f) => f.value === data.fitzpatrickType)
  const hasSkinTypes = data.skinTypes !== null && data.skinTypes.length > 0
  const hasConcerns = data.skinConcerns !== null && data.skinConcerns.length > 0
  const hasSkinSection = hasSkinTypes || !!fitzItem || hasConcerns
  const hasLinks = data.links !== null && data.links.length > 0

  return (
    <main className="public-profile">
      <header className="public-profile__header">
        <ProfileAvatar avatarUrl={data.avatarUrl} username={data.username} size="xl" />
        <PageTitle title={`@${data.username}`} />
        {data.bio && <p className="public-profile__bio">{data.bio}</p>}
      </header>

      {hasLinks && (
        <section className="public-profile__section">
          <h2 className="public-profile__section-title">Liens</h2>
          <ul role="list" className="public-profile__links">
            {data.links?.map((link) => {
              const safe = sanitizeUrl(link.url)
              if (!safe) return null
              return (
                <li key={`${link.label}-${link.url}`}>
                  <a
                    className="public-profile__link"
                    href={safe}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.label}
                  </a>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {hasSkinSection && (
        <section className="public-profile__section">
          <h2 className="public-profile__section-title">Peau</h2>
          <dl className="public-profile__skin">
            {hasSkinTypes && (
              <div className="public-profile__skin-row">
                <dt className="public-profile__skin-label">Type</dt>
                <dd className="public-profile__skin-value">
                  <div className="public-profile__chips">
                    {data.skinTypes?.map((t) => (
                      <span key={t} className="public-profile__chip">
                        {SKIN_TYPE_LABELS[t] ?? t}
                      </span>
                    ))}
                  </div>
                </dd>
              </div>
            )}
            {fitzItem && (
              <div className="public-profile__skin-row">
                <dt className="public-profile__skin-label">Phototype</dt>
                <dd className="public-profile__skin-value">
                  {fitzItem.label} — {fitzItem.description}
                </dd>
              </div>
            )}
            {hasConcerns && (
              <div className="public-profile__skin-row">
                <dt className="public-profile__skin-label">Problématiques</dt>
                <dd className="public-profile__skin-value">
                  <div className="public-profile__chips">
                    {data.skinConcerns?.map((c) => (
                      <span key={c} className="public-profile__chip">
                        {SKIN_CONCERN_LABELS[c] ?? c}
                      </span>
                    ))}
                  </div>
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* Layer ②: public collections (le payload porte-produits) — reserved for
          the public-collections spec (#8). Cleanly absent until then. */}

      {/* Layer ③: recent trail (posts then reviews, §18). Each self-hides when empty. */}
      <ProfilePostsSection username={username} />
      <ProfileReviewsSection username={username} />

      {!hasAnyVisibleField(data) &&
        reviewsData?.reviews.length === 0 &&
        postsData?.posts.length === 0 && (
          <p className="public-profile__empty">
            Ce profil est public, mais aucune information n'est partagée pour le moment.
          </p>
        )}
    </main>
  )
}
