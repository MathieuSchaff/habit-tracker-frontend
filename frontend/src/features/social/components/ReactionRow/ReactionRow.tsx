import type { ReactableType, Reactor } from '@aurore/shared'
import { REACTION_KINDS } from '@aurore/shared'

import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import { Button } from '@/component/Button/Button'
import { REACTION_KIND_LABELS } from '@/constants/social'
import { useAnnounce } from '@/hooks/useAnnounce'
import { reactionQueries, useToggleReaction } from '@/lib/queries/social'
import { useAuthStore } from '@/store/auth'

import './ReactionRow.css'

// One reactor, signed — links to the profile only when public (ReviewerName
// pattern). Never rendered as a number; the names themselves are the signal.
function ReactorName({ reactor }: { reactor: Reactor }) {
  if (reactor.profilePublic) {
    return (
      <Link
        className="reaction-row__reactor-link"
        to="/u/$username"
        params={{ username: reactor.username }}
      >
        {reactor.username}
      </Link>
    )
  }
  return <span className="reaction-row__reactor">{reactor.username}</span>
}

// Entraide reactions on a Reactable (post / thread / reply). Shows WHO reacted per
// kind, never a count (ADR-0013). Toggling is signed and needs auth; anonymous
// readers see existing reactors but no buttons, and an empty anonymous row renders
// nothing (calme — no controls a logged-out reader can't use).
export function ReactionRow({
  reactableType,
  reactableId,
}: {
  reactableType: ReactableType
  reactableId: string
}) {
  const { data } = useQuery(reactionQueries.list(reactableType, reactableId))
  const toggle = useToggleReaction(reactableType, reactableId)
  const announce = useAnnounce()

  // Auth from the store token, not a me() query: ReactionRow renders on anon
  // surfaces (product/profile/thread) and only needs the boolean — querying
  // /api/profile here just 401s (twice, retry-amplified) per anon view.
  const isAuthed = useAuthStore((s) => !!s.accessToken)
  const viewerKinds = data?.viewerKinds ?? []
  // Boolean, never a sum: the doctrine forbids a count even in component scope
  // (ADR-0013). The row only needs to know whether anyone reacted at all.
  const hasAnyReaction = data ? Object.values(data.reactions).some((r) => r.length > 0) : false

  if (!isAuthed && !hasAnyReaction) return null

  return (
    <div className="reaction-row">
      {REACTION_KINDS.map((kind) => {
        const reactors = data?.reactions[kind] ?? []
        const pressed = viewerKinds.includes(kind)
        const label = REACTION_KIND_LABELS[kind]
        return (
          <div key={kind} className="reaction-row__kind">
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={pressed}
              disabled={!isAuthed || toggle.isPending}
              onClick={() =>
                toggle.mutate(
                  { kind, on: !pressed },
                  {
                    onSuccess: () =>
                      announce(
                        pressed ? `Réaction « ${label} » retirée` : `Réaction « ${label} » ajoutée`
                      ),
                  }
                )
              }
            >
              {label}
            </Button>
            {reactors.length > 0 && (
              <ul
                role="list"
                className="reaction-row__reactors"
                aria-label={`Réactions « ${label} »`}
              >
                {reactors.map((reactor) => (
                  <li key={`${kind}:${reactor.username}`}>
                    <ReactorName reactor={reactor} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
