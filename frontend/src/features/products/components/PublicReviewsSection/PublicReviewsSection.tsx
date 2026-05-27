import type { PublicReviewView, ReviewAxisKey } from '@habit-tracker/shared'
import { reviewAxisKeys } from '@habit-tracker/shared'

import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import { Time } from '@/component/DataDisplay/Time/Time'
import { SectionHeader } from '@/component/Typography/SectionHeader/SectionHeader'
import { ReportContentButton } from '@/features/discussions/components/ReportContentButton'
import { productQueries } from '@/lib/queries/products'
import { useAuthStore } from '@/store/auth'

import './PublicReviewsSection.css'

interface PublicReviewsSectionProps {
  slug: string
}

// Doc-prescribed neutral labels.
// Tight wording, no medical, no winners, no scores.
const AXIS_LABELS: Record<ReviewAxisKey, string> = {
  tolerance: 'Tolérance',
  efficacy: 'Effet ressenti',
  sensoriality: 'Sensorialité',
  stability: 'Stabilité',
  mixability: 'Compatibilité routine',
  valueForMoney: 'Rapport qualité-prix',
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
  const isAuthenticated = useAuthStore((state) => !!state.accessToken)

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

  const { reviews } = data

  return (
    <section className="product-section public-reviews">
      <SectionHeader
        title="Retours utilisateurs"
        count={reviews.length > 0 ? reviews.length : undefined}
        variant="primary"
      />

      {reviews.length === 0 ? (
        <p className="public-reviews__empty">
          Aucun retour partagé publiquement pour ce produit pour le moment. Vous pouvez partager vos
          retours via le toggle dans votre étagère.
        </p>
      ) : (
        <>
          <p className="public-reviews__intro">
            Des expériences personnelles partagées par leurs auteurs, pas un verdict.
          </p>
          <ul className="public-reviews__verbatims">
            {reviews.map((review) => {
              // Only show axis notes when the author opted ratings public (non-null values).
              const ratedAxes = reviewAxisKeys.filter((k) => review[k] != null)
              return (
                <li key={review.id} className="public-reviews__verbatim">
                  <header className="public-reviews__verbatim-header">
                    <ReviewerName reviewer={review.reviewer} />
                    <Time
                      iso={review.createdAt}
                      style="monthYear"
                      className="public-reviews__verbatim-date"
                    />
                    {isAuthenticated && (
                      <ReportContentButton targetType="review" targetId={review.id} />
                    )}
                  </header>
                  <p className="public-reviews__verbatim-body">{review.comment}</p>
                  {ratedAxes.length > 0 && (
                    <dl className="public-reviews__axis-list">
                      {ratedAxes.map((key) => (
                        <div key={key} className="public-reviews__axis">
                          <dt className="public-reviews__axis-label">{AXIS_LABELS[key]}</dt>
                          <dd className="public-reviews__axis-value">{review[key]}/5</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
