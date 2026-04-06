import type { UserDermoProfile } from '@habit-tracker/shared'

import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { FITZPATRICK_ITEMS, SKIN_CONCERN_LABELS, SKIN_TYPE_LABELS } from '@/constants/skin'
import './SkinProfileRead.css'

type SkinProfileReadProps = {
  dermo: UserDermoProfile
}

export function SkinProfileRead({ dermo }: SkinProfileReadProps) {
  const [notesExpanded, setNotesExpanded] = useState(false)
  const hasSkinTypes = dermo.skinTypes && dermo.skinTypes.length > 0
  const hasConcerns = dermo.skinConcerns && dermo.skinConcerns.length > 0
  const fitzItem = FITZPATRICK_ITEMS.find((f) => f.value === dermo.fitzpatrickType)
  const hasNotes = dermo.privateNotes && dermo.privateNotes.trim().length > 0
  const isEmpty = !hasSkinTypes && !fitzItem && !hasConcerns && !hasNotes

  if (isEmpty) {
    return <p className="skin-read__empty">Aucun profil peau renseigné.</p>
  }

  return (
    <div className="skin-read">
      {hasSkinTypes && (
        <div className="skin-read__row">
          <span className="skin-read__label">Type de peau</span>
          <div className="skin-read__chips">
            {dermo.skinTypes?.map((t) => (
              <span key={t} className="skin-read__chip">
                {SKIN_TYPE_LABELS[t as keyof typeof SKIN_TYPE_LABELS] ?? t}
              </span>
            ))}
          </div>
        </div>
      )}

      {fitzItem && (
        <div className="skin-read__row">
          <span className="skin-read__label">Phototype</span>
          <span
            className={clsx('skin-read__fitz-badge', `skin-read__fitz-badge--${fitzItem.value}`)}
          >
            {fitzItem.label} — {fitzItem.description}
          </span>
        </div>
      )}

      {hasConcerns && (
        <div className="skin-read__row">
          <span className="skin-read__label">Problématiques</span>
          <div className="skin-read__chips skin-read__chips--sm">
            {dermo.skinConcerns?.map((c) => (
              <span key={c} className="skin-read__chip skin-read__chip--sm">
                {SKIN_CONCERN_LABELS[c as keyof typeof SKIN_CONCERN_LABELS] ?? c}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasNotes && (
        <div className="skin-read__row skin-read__notes-row">
          <span className="skin-read__label">Notes privées</span>
          <div
            className={clsx('skin-read__notes', !notesExpanded && 'skin-read__notes--collapsed')}
          >
            <p className="skin-read__notes-text">{dermo.privateNotes}</p>
          </div>
          {(dermo.privateNotes?.length ?? 0) > 150 && (
            <button
              type="button"
              className="skin-read__notes-toggle"
              onClick={() => setNotesExpanded(!notesExpanded)}
              aria-expanded={notesExpanded}
            >
              <ChevronDown
                size={14}
                className={clsx(
                  'skin-read__notes-chevron',
                  notesExpanded && 'skin-read__notes-chevron--open'
                )}
              />
              {notesExpanded ? 'Voir moins' : 'Voir plus'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
