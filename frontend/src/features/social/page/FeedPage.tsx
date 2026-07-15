import type { SkinConcern } from '@aurore/shared'
import { FEED_ORDERS, POST_TONES } from '@aurore/shared'

import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'

import { Button } from '@/component/Button/Button'
import { EmptyState } from '@/component/Feedback/ui/EmptyState/EmptyState'
import { Spinner } from '@/component/Feedback/ui/Spinner/Spinner'
import { ChipGroup } from '@/component/Input/ChipGroup/ChipGroup'
import { ListPageLayout } from '@/component/Layout/PageLayout/ListPageLayout'
import { Tabs } from '@/component/Tabs/Tabs'
import { FEED_ORDER_LABELS, POST_TONE_LABELS, SKIN_CONCERN_LABELS } from '@/constants/skin'
import { FeedPostCard } from '@/features/social/components/FeedPostCard/FeedPostCard'
import { profileQueries } from '@/lib/queries/profile'
import { socialQueries } from '@/lib/queries/social'

import './FeedPage.css'

const routeApi = getRouteApi('/_authenticated/feed')

const ALL_CONCERNS = '__all__'
type ConcernChoice = SkinConcern | typeof ALL_CONCERNS

const toneTabs = POST_TONES.map((tone) => ({ id: tone, label: POST_TONE_LABELS[tone] }))
const orderChips = FEED_ORDERS.map((order) => ({ value: order, label: FEED_ORDER_LABELS[order] }))

export function FeedPage() {
  const { tone, order, concern } = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const { data, isFetching, isPending, isError, refetch } = useQuery(
    socialQueries.feed({ tone, order, concern })
  )
  // Concern scope is drawn from the viewer's own problématiques — a stable source
  // independent of the filtered result (so chips never vanish as you filter).
  const { data: dermo } = useQuery(profileQueries.dermo())

  const posts = data?.posts ?? []
  const concernChips = [
    { value: ALL_CONCERNS as ConcernChoice, label: 'Toutes' },
    ...(dermo?.skinConcerns ?? []).map((c) => ({
      value: c as ConcernChoice,
      label: SKIN_CONCERN_LABELS[c],
    })),
  ]

  return (
    <ListPageLayout>
      <ListPageLayout.Header
        title="Le fil des semblables"
        meta="Les publications des personnes qui partagent votre peau."
        isLoading={isFetching}
        maxWidth="640px"
      />

      <div className="feed-filters">
        <Tabs
          options={toneTabs}
          activeTab={tone}
          onTabChange={(next) => navigate({ search: (prev) => ({ ...prev, tone: next }) })}
          variant="pill"
          hasPanels={false}
          ariaLabel="Ton des publications"
        />
        <div className="feed-filters__row">
          {concernChips.length > 1 && (
            <ChipGroup
              options={concernChips}
              selected={[concern ?? ALL_CONCERNS]}
              onChange={([next]) =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    concern: next === ALL_CONCERNS ? undefined : (next as SkinConcern),
                  }),
                })
              }
              mode="exclusive"
              size="sm"
              aria-label="Filtrer par problématique"
            />
          )}
          <ChipGroup
            options={orderChips}
            selected={[order]}
            onChange={([next]) => navigate({ search: (prev) => ({ ...prev, order: next }) })}
            mode="exclusive"
            size="sm"
            aria-label="Trier le fil"
          />
        </div>
        {order === 'similarity' && (
          // The affinity sort runs over a bounded recent window, not the whole
          // cohort — name the scope so "Affinité" doesn't over-promise.
          <p className="feed-filters__note">Trié par affinité, parmi les publications récentes.</p>
        )}
      </div>

      <ListPageLayout.Body maxWidth="640px">
        {isPending ? (
          <Spinner />
        ) : isError ? (
          <EmptyState
            title="Le fil n'a pas pu se charger"
            subtitle="Vos données sont intactes — réessayez dans un instant."
          >
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Réessayer
            </Button>
          </EmptyState>
        ) : posts.length === 0 ? (
          <EmptyState
            title="Rien pour l'instant"
            subtitle="Quand des personnes proches de vous publieront, leurs partages apparaîtront ici."
          />
        ) : (
          <ul role="list" className="feed-list">
            {posts.map((post) => (
              <FeedPostCard key={post.id} post={post} />
            ))}
          </ul>
        )}
      </ListPageLayout.Body>
    </ListPageLayout>
  )
}
