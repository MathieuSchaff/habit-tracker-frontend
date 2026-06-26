import { Link } from '@tanstack/react-router'
import { Users } from 'lucide-react'

import { Badge } from '@/component/DataDisplay/Badge/Badge'
import { EmptyState } from '@/component/Feedback/ui/EmptyState/EmptyState'
import { SIMILARITY_BAND_LABELS } from '@/constants/skin'
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar/ProfileAvatar'
import type { SimilarProfile } from '@/lib/queries/social'
import './SimilarPeopleList.css'

type SimilarPeopleListProps = {
  profiles: SimilarProfile[]
}

export function SimilarPeopleList({ profiles }: SimilarPeopleListProps) {
  // Defense-in-depth: éloigné is never a surface, even if it reaches the client
  // (the backend already excludes it). Only the two positive bands are shown.
  const surfaced = profiles.filter((profile) => profile.band !== 'eloigne')

  if (surfaced.length === 0) {
    return (
      <EmptyState
        icon={<Users size={24} />}
        title="Pas encore de profils proches"
        subtitle="Quand des personnes à la peau proche de la vôtre se rendent trouvables, elles apparaissent ici."
      />
    )
  }

  return (
    <ul role="list" className="similar-people">
      {surfaced.map((profile) => {
        const label = SIMILARITY_BAND_LABELS[profile.band]
        return (
          <li key={profile.username} className="similar-people__row">
            <ProfileAvatar username={profile.username} size="sm" />
            <Link
              className="similar-people__name"
              to="/u/$username"
              params={{ username: profile.username }}
            >
              {profile.username}
            </Link>
            {label && (
              <Badge variant="skincare" className="similar-people__band">
                {label}
              </Badge>
            )}
          </li>
        )
      })}
    </ul>
  )
}
