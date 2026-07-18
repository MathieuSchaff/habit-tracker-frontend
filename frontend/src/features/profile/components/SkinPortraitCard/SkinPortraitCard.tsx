import type { UserDermoProfile } from '@aurore/shared'

import clsx from 'clsx'
import { Suspense } from 'react'

import { Spinner } from '@/component/Feedback/ui/Spinner/Spinner'
import { FITZPATRICK_ITEMS } from '@/constants/skin'
import { DermoProfileForm } from '../../tabs/SkinTab/DermoProfileForm'
import { SectionCard, SectionCardEmpty } from '../SectionCard/SectionCard'
import { SkinProfileRead } from '../SkinProfileRead/SkinProfileRead'
import './SkinPortraitCard.css'

type SkinPortraitCardProps = {
  dermo: UserDermoProfile | null | undefined
  isEditing: boolean
  onEdit: () => void
  onCloseEdit: () => void
}

export function SkinPortraitCard({ dermo, isEditing, onEdit, onCloseEdit }: SkinPortraitCardProps) {
  const fitz = dermo?.fitzpatrickType
    ? FITZPATRICK_ITEMS.find((f) => f.value === dermo.fitzpatrickType)
    : null

  const hasContent = Boolean(
    dermo &&
      ((dermo.skinTypes?.length ?? 0) > 0 ||
        dermo.fitzpatrickType ||
        (dermo.skinConcerns?.length ?? 0) > 0 ||
        (dermo.privateNotes && dermo.privateNotes.trim().length > 0))
  )

  return (
    <SectionCard
      overline="Portrait de peau"
      title="Ma peau"
      titleId="skin-portrait-card-title"
      className={clsx('skin-portrait-card', isEditing && 'skin-portrait-card--editing')}
      isEditing={isEditing}
      onEdit={onEdit}
      editLabel="Modifier le portrait de peau"
    >
      {isEditing ? (
        <Suspense fallback={<Spinner />}>
          <DermoProfileForm onSave={onCloseEdit} onCancel={onCloseEdit} />
        </Suspense>
      ) : (
        <div className="skin-portrait-card__body">
          <div
            className="skin-portrait-card__halo-wrapper"
            data-fitz={fitz?.value ?? 0}
            aria-hidden={fitz ? 'false' : 'true'}
          >
            {fitz ? (
              <>
                <div
                  className={`skin-portrait-card__halo skin-portrait-card__halo--${fitz.value}`}
                  role="img"
                  aria-label={`Phototype ${fitz.label}. ${fitz.description}.`}
                >
                  <span className="skin-portrait-card__halo-numeral">{fitz.label}</span>
                </div>
                <p className="skin-portrait-card__halo-caption">{fitz.description}</p>
              </>
            ) : (
              <div className="skin-portrait-card__halo skin-portrait-card__halo--empty">
                <span className="skin-portrait-card__halo-placeholder" aria-hidden="true">
                  ◦
                </span>
              </div>
            )}
          </div>

          {hasContent ? (
            dermo && <SkinProfileRead dermo={dermo} hideFitzpatrick />
          ) : (
            <SectionCardEmpty
              title="Aucun portrait pour le moment."
              className="skin-portrait-card__empty"
            >
              Renseignez votre type de peau, votre phototype et ce que vous suivez, à votre rythme.
            </SectionCardEmpty>
          )}
        </div>
      )}
    </SectionCard>
  )
}
