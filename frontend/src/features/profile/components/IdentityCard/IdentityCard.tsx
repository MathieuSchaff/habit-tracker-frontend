import type { ProfilePublic, ProfileUpdateInput } from '@aurore/shared'

import { ExternalLink } from 'lucide-react'

import { sanitizeUrl } from '@/lib/url'
import { ProfileForm } from '../ProfileForm/ProfileForm'
import { SectionCard, SectionCardEmpty } from '../SectionCard/SectionCard'
import './IdentityCard.css'

type IdentityCardProps = {
  profile: ProfilePublic
  isEditing: boolean
  onEdit: () => void
  onCloseEdit: () => void
  onSubmit: (data: ProfileUpdateInput) => void
  isPending: boolean
  errorMessage: string | null
}

export function IdentityCard({
  profile,
  isEditing,
  onEdit,
  onCloseEdit,
  onSubmit,
  isPending,
  errorMessage,
}: IdentityCardProps) {
  const hasBio = Boolean(profile.bio && profile.bio.trim().length > 0)
  const hasLinks = (profile.links?.length ?? 0) > 0
  const hasContent = hasBio || hasLinks

  return (
    <SectionCard
      overline="Identité"
      title="Mes informations"
      titleId="identity-card-title"
      className="identity-card"
      isEditing={isEditing}
      onEdit={onEdit}
      editLabel="Modifier mes informations"
    >
      {isEditing ? (
        <ProfileForm
          profile={profile}
          onSubmit={onSubmit}
          onCancel={onCloseEdit}
          isPending={isPending}
          error={errorMessage}
        />
      ) : (
        <div className="identity-card__body">
          {hasContent ? (
            <>
              {hasBio && <p className="identity-card__bio">{profile.bio}</p>}
              {hasLinks && (
                <ul role="list" className="identity-card__links" aria-label="Mes liens">
                  {profile.links?.map((link) => (
                    <li key={link.url}>
                      <a
                        href={sanitizeUrl(link.url) ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="identity-card__link"
                      >
                        <ExternalLink size={13} aria-hidden="true" />
                        <span>{link.label || link.url}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <SectionCardEmpty
              title="Quelques mots ou liens, si vous voulez."
              className="identity-card__empty"
            >
              Une bio courte et vos pages publiques aident à retrouver votre étagère ailleurs. Rien
              d'obligatoire.
            </SectionCardEmpty>
          )}
        </div>
      )}
    </SectionCard>
  )
}
