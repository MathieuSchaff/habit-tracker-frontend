import {
  type PreferencesTag,
  preferencesTags,
  type RessentiTag,
  type RoutineTag,
  ressentiTags,
  routineTags,
} from '@habit-tracker/shared'

import { ChipGroup } from '@/component/Input/ChipGroup/ChipGroup'
import { preferencesLabels, ressentiLabels, routineLabels } from '@/features/collection/constants'

import './ExperienceTags.css'

interface ExperienceTagsProps {
  ressenti: RessentiTag[]
  routine: RoutineTag[]
  preferences: PreferencesTag[]
  onChangeRessenti: (next: RessentiTag[]) => void
  onChangeRoutine: (next: RoutineTag[]) => void
  onChangePreferences: (next: PreferencesTag[]) => void
}

const ressentiOptions = ressentiTags.map((slug) => ({ value: slug, label: ressentiLabels[slug] }))
const routineOptions = routineTags.map((slug) => ({ value: slug, label: routineLabels[slug] }))
const preferencesOptions = preferencesTags.map((slug) => ({
  value: slug,
  label: preferencesLabels[slug],
}))

export function ExperienceTags({
  ressenti,
  routine,
  preferences,
  onChangeRessenti,
  onChangeRoutine,
  onChangePreferences,
}: ExperienceTagsProps) {
  return (
    <div className="exp-tags">
      <div className="exp-tags__group">
        <h4 className="exp-tags__title">Comment vous le ressentez</h4>
        <ChipGroup
          options={ressentiOptions}
          selected={ressenti}
          onChange={onChangeRessenti}
          size="sm"
          aria-label="Ressenti à l'application"
        />
      </div>
      <div className="exp-tags__group">
        <h4 className="exp-tags__title">Quand vous l'utilisez</h4>
        <ChipGroup
          options={routineOptions}
          selected={routine}
          onChange={onChangeRoutine}
          size="sm"
          aria-label="Moment d'usage dans votre routine"
        />
      </div>
      <div className="exp-tags__group">
        <h4 className="exp-tags__title">Préférences</h4>
        <ChipGroup
          options={preferencesOptions}
          selected={preferences}
          onChange={onChangePreferences}
          size="sm"
          aria-label="Préférences personnelles"
        />
      </div>
    </div>
  )
}
