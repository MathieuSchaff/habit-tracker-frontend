import type { PublicReviewView, ReviewAxisAggregate, ReviewAxisKey } from '@habit-tracker/shared'
import { reviewAxisKeys } from '@habit-tracker/shared'

import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import { SectionHeader } from '@/component/Typography/SectionHeader/SectionHeader'
import { productQueries } from '@/lib/queries/products'

import './PublicReviewsSection.css'

interface PublicReviewsSectionProps {
  slug: string
}

// Doc-prescribed neutral labels (cf docs/04-design-ux/ux-writing.md).
// Tight wording, no medical, no winners, no scores.
const AXIS_LABELS: Record<ReviewAxisKey, string> = {
  tolerance: 'Tolérance',
  efficacy: 'Effet ressenti',
  sensoriality: 'Sensorialité',
  stability: 'Stabilité',
  mixability: 'Compatibilité routine',
  valueForMoney: 'Rapport qualité-prix',
}

const BUCKET_LABELS = {
  high: 'favorable',
  mid: 'mitigé',
  low: 'réservé',
} as const

function hasAnyVote(agg: ReviewAxisAggregate): boolean {
  return agg.low + agg.mid + agg.high > 0
}

function formatBucketLine(agg: ReviewAxisAggregate): string {
  const parts: string[] = []
  if (agg.high > 0) parts.push(`${agg.high} ${BUCKET_LABELS.high}${agg.high > 1 ? 's' : ''}`)
  if (agg.mid > 0) parts.push(`${agg.mid} ${BUCKET_LABELS.mid}${agg.mid > 1 ? 's' : ''}`)
  if (agg.low > 0) parts.push(`${agg.low} ${BUCKET_LABELS.low}${agg.low > 1 ? 's' : ''}`)
  return parts.join(', ')
}

function formatReviewDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
    })
  } catch {
    return ''
  }
}

function ReviewerName({ reviewer }: { reviewer: PublicReviewView['reviewer'] }) {
  if (reviewer.profilePublic) {
    return (
      <Link
        className="public-reviews__author-link"
        to="/u/$username"
        params={{ username: reviewer.username }}
      >
        {reviewer.username}
      </Link>
    )
  }
  return <span className="public-reviews__author-name">{reviewer.username}</span>
}

export function PublicReviewsSection({ slug }: PublicReviewsSectionProps) {
  const { data, isLoading, isError } = useQuery(productQueries.publicReviews(slug))

  if (isLoading) {
    return (
      <section className="product-section public-reviews">
        <SectionHeader title="Retours utilisateurs" variant="primary" />
        <p className="public-reviews__empty">Chargement des retours partagés…</p>
      </section>
    )
  }

  if (isError || !data) {
    return (
      <section className="product-section public-reviews">
        <SectionHeader title="Retours utilisateurs" variant="primary" />
        <p className="public-reviews__empty">
          Retours indisponibles pour le moment. Vous pouvez réessayer plus tard.
        </p>
      </section>
    )
  }

  const { reviews, aggregates } = data
  const reviewsWithComment = reviews.filter((r) => r.comment != null && r.comment.trim().length > 0)
  const axesWithVotes = reviewAxisKeys.filter((k) => hasAnyVote(aggregates.byAxis[k]))

  return (
    <section className="product-section public-reviews">
      <SectionHeader
        title="Retours utilisateurs"
        count={aggregates.total > 0 ? aggregates.total : undefined}
        variant="primary"
      />

      {aggregates.total === 0 ? (
        <p className="public-reviews__empty">
          Aucun retour partagé publiquement pour ce produit pour le moment. Vous pouvez partager vos
          retours via le toggle dans votre étagère.
        </p>
      ) : (
        <>
          {axesWithVotes.length > 0 && (
            <div className="public-reviews__aggregates">
              <p className="public-reviews__aggregates-intro">
                Sur les retours partagés, voici comment chacun a perçu cette formule. Ce sont des
                expériences personnelles, pas un verdict.
              </p>
              <dl className="public-reviews__axis-list">
                {axesWithVotes.map((key) => (
                  <div key={key} className="public-reviews__axis">
                    <dt className="public-reviews__axis-label">{AXIS_LABELS[key]}</dt>
                    <dd className="public-reviews__axis-buckets">
                      {formatBucketLine(aggregates.byAxis[key])}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {reviewsWithComment.length > 0 ? (
            <ul className="public-reviews__verbatims">
              {reviewsWithComment.map((review) => (
                <li
                  key={`${review.reviewer.username}-${review.createdAt}`}
                  className="public-reviews__verbatim"
                >
                  <header className="public-reviews__verbatim-header">
                    <ReviewerName reviewer={review.reviewer} />
                    <time className="public-reviews__verbatim-date" dateTime={review.createdAt}>
                      {formatReviewDate(review.createdAt)}
                    </time>
                  </header>
                  <p className="public-reviews__verbatim-body">{review.comment}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="public-reviews__empty public-reviews__empty--secondary">
              Pas encore de retour écrit pour ce produit. Les notes partagées plus haut viennent de
              {aggregates.total > 1 ? ` ${aggregates.total} personnes.` : ' une personne.'}
            </p>
          )}
        </>
      )}
    </section>
  )
}
