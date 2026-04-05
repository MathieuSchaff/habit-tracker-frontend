import type { SkinConcern, SkinType, UserDermoProfileUpdateInput } from '@habit-tracker/shared'
import { SKIN_CONCERNS, SKIN_TYPES } from '@habit-tracker/shared'

import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { useEffect, useState } from 'react'

import { Button } from '@/component/Button/Button'
import { FormMessage } from '@/component/Feedback/FormMessage/FormMessage'
import { ChipGroup } from '@/component/Input/ChipGroup/ChipGroup'
import { Textarea } from '@/component/Textarea/Textarea'
import { FITZPATRICK_ITEMS, SKIN_CONCERN_LABELS, SKIN_TYPE_LABELS } from '@/constants/skin'
import { profileQueries, useUpdateDermoProfile } from '../../../../lib/queries/profile'
import './DermoProfileForm.css'

export function DermoProfileForm() {
  const { data: dermo, isLoading } = useQuery(profileQueries.dermo())
  const updateMutation = useUpdateDermoProfile()

  const [skinTypes, setSkinTypes] = useState<SkinType[]>([])
  const [fitzpatrickType, setFitzpatrickType] = useState<number | null>(null)
  const [skinConcerns, setSkinConcerns] = useState<SkinConcern[]>([])
  const [privateNotes, setPrivateNotes] = useState('')
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (dermo) {
      setSkinTypes((dermo.skinTypes ?? []) as SkinType[])
      setFitzpatrickType(dermo.fitzpatrickType ?? null)
      setSkinConcerns((dermo.skinConcerns ?? []) as SkinConcern[])
      setPrivateNotes(dermo.privateNotes ?? '')
    }
  }, [dermo])

  const skinTypeOptions = SKIN_TYPES.map((t) => ({ value: t, label: SKIN_TYPE_LABELS[t] }))
  const skinConcernOptions = SKIN_CONCERNS.map((c) => ({ value: c, label: SKIN_CONCERN_LABELS[c] }))

  const handleSave = () => {
    const data: UserDermoProfileUpdateInput = {
      skinTypes,
      fitzpatrickType,
      skinConcerns,
      privateNotes: privateNotes || null,
    }
    updateMutation.mutate(data, { onSuccess: () => setIsDirty(false) })
  }

  if (isLoading) return <output className="dermo-form__loading">Chargement...</output>

  return (
    <div className="dermo-form">
      <section className="dermo-section">
        <span className="dermo-section__overline" aria-hidden="true">
          Type de peau
        </span>
        <h3 className="dermo-section__title">Type de peau</h3>
        <p className="dermo-section__desc" id="skin-type-desc">
          Sélectionnez jusqu'à 3 types.
        </p>
        <ChipGroup
          options={skinTypeOptions}
          selected={skinTypes}
          onChange={(v) => {
            setSkinTypes(v as SkinType[])
            setIsDirty(true)
          }}
          max={3}
          aria-label="Type de peau"
          aria-describedby="skin-type-desc"
        />
      </section>

      <section className="dermo-section">
        <span className="dermo-section__overline" aria-hidden="true">
          Phototype
        </span>
        <h3 className="dermo-section__title">Phototype de Fitzpatrick</h3>
        <p className="dermo-section__desc" id="fitzpatrick-desc">
          Réaction de votre peau au soleil.
        </p>
        <div
          className="dermo-fitzpatrick"
          role="radiogroup"
          aria-label="Phototype de Fitzpatrick"
          aria-describedby="fitzpatrick-desc"
        >
          {FITZPATRICK_ITEMS.map(({ value, label, description }) => (
            <label
              key={value}
              className={clsx(
                'dermo-fitz-item',
                fitzpatrickType === value && 'dermo-fitz-item--active'
              )}
            >
              <input
                type="radio"
                name="fitzpatrick"
                className="sr-only"
                checked={fitzpatrickType === value}
                onChange={() => {
                  setFitzpatrickType(value)
                  setIsDirty(true)
                }}
              />
              <span className="dermo-fitz-label">{label}</span>
              <span className="dermo-fitz-desc">{description}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="dermo-section">
        <span className="dermo-section__overline" aria-hidden="true">
          Conditions
        </span>
        <h3 className="dermo-section__title">Problématiques & conditions</h3>
        <ChipGroup
          options={skinConcernOptions}
          selected={skinConcerns}
          onChange={(v) => {
            setSkinConcerns(v as SkinConcern[])
            setIsDirty(true)
          }}
          size="sm"
          aria-label="Problématiques et conditions"
        />
      </section>

      <section className="dermo-section">
        <span className="dermo-section__overline" aria-hidden="true">
          Privé
        </span>
        <h3 className="dermo-section__title" id="dermo-notes-title">
          Notes privées
        </h3>
        <p className="dermo-section__desc">
          Ces notes sont privées et utilisées uniquement pour les recommandations personnalisées.
        </p>
        <Textarea
          label=""
          aria-labelledby="dermo-notes-title"
          value={privateNotes}
          onChange={(e) => {
            setPrivateNotes(e.target.value)
            setIsDirty(true)
          }}
          placeholder="Ex : réagis fort aux parfums, sous traitement isotrétinoïne…"
          maxLength={2000}
          hint={`${privateNotes.length}/2000`}
          rows={4}
        />
      </section>

      {updateMutation.isError && (
        <FormMessage variant="error">Une erreur est survenue lors de la sauvegarde.</FormMessage>
      )}
      {updateMutation.isSuccess && !isDirty && (
        <FormMessage variant="success">Profil dermato enregistré.</FormMessage>
      )}

      <div className="dermo-form__actions">
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={handleSave}
          loading={updateMutation.isPending}
          disabled={!isDirty}
        >
          Enregistrer
        </Button>
      </div>
    </div>
  )
}
