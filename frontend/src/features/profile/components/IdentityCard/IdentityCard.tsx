import type { ProfilePublic, ProfileUpdateInput } from '@habit-tracker/shared'

import clsx from 'clsx'
import { ExternalLink, Pencil } from 'lucide-react'

import { Button } from '@/component/Button/Button'
import { sanitizeUrl } from '@/lib/url'
import { ProfileForm } from '../ProfileForm/ProfileForm'
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
    <section
      className={clsx('identity-card', isEditing && 'identity-card--editing')}
      aria-labelledby="identity-card-title"
    >
      <header className="identity-card__header">
        <div className="identity-card__heading">
          <span className="identity-card__overline" aria-hidden="true">
            Identité
          </span>
          <h2 id="identity-card-title" className="identity-card__title">
            Mes informations
          </h2>
        </div>
        {!isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onEdit}
            aria-label="Modifier mes informations"
            className="identity-card__edit"
          >
            <Pencil size={16} aria-hidden="true" />
          </Button>
        )}
      </header>

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
                <ul className="identity-card__links" aria-label="Mes liens">
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
            <div className="identity-card__empty">
              <p className="identity-card__empty-title">Quelques mots ou liens, si vous voulez.</p>
              <p className="identity-card__empty-text">
                Une bio courte et vos pages publiques aident à retrouver votre étagère ailleurs.
                Rien d'obligatoire.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
