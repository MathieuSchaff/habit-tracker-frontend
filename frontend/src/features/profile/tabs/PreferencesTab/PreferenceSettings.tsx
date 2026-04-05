import type { DisplayScale } from '@habit-tracker/shared'

import { useQuery } from '@tanstack/react-query'

import { ChipGroup } from '../../../../component/Input/ChipGroup/ChipGroup'
import { SettingsSection } from '../../../../component/Layout/SettingsSection/SettingsSection'
import {
  userPreferenceQueries,
  useUpdateUserPreferences,
} from '../../../../lib/queries/user-preferences'
import type { Variant } from '../../../../store/theme'
import { useThemeStore } from '../../../../store/theme'

import './PreferenceSettings.css'

const PALETTE_SWATCHES: Array<{ variant: Variant; label: string; color: string }> = [
  { variant: 'bleu', label: 'Bleu', color: 'oklch(55% 0.2 260)' },
  { variant: 'terracota', label: 'Terracota', color: 'oklch(52% 0.13 32)' },
  { variant: 'foret', label: 'Forêt', color: 'oklch(40% 0.16 140)' },
  { variant: 'ardoise', label: 'Ardoise', color: 'oklch(35% 0.12 240)' },
]

const criteriaLabels: Record<string, string> = {
  tolerance: 'Tolérance',
  efficacy: 'Efficacité',
  sensoriality: 'Sensorialité',
  stability: 'Stabilité',
  mixability: 'Mixabilité',
  valueForMoney: 'Rapport Q/P',
}

const scaleLabels: Record<DisplayScale, string> = {
  out_of_5: 'Sur 5',
  out_of_10: 'Sur 10',
  out_of_20: 'Sur 20',
  percentage: 'Pourcentage (%)',
}

export function PreferenceSettings() {
  const { data: prefs, isLoading } = useQuery(userPreferenceQueries.get())
  const updateMutation = useUpdateUserPreferences()
  const { variant, setVariant } = useThemeStore()

  if (isLoading || !prefs) return <output>Chargement des préférences...</output>

  // No debounce — keeps the UI feeling fast.
  const handleWeightChange = (key: string, value: number) => {
    updateMutation.mutate({
      criteriaWeights: { [key]: value },
    })
  }

  const scaleOptions = (Object.keys(scaleLabels) as DisplayScale[]).map((s) => ({
    value: s,
    label: scaleLabels[s],
  }))

  return (
    <div className="pref-settings">
      <SettingsSection
        title="Échelle d'affichage"
        description="Choisissez comment les notes de vos produits sont affichées."
      >
        <ChipGroup
          options={scaleOptions}
          selected={prefs.displayScale ? [prefs.displayScale] : []}
          onChange={([scale]) => {
            if (scale) updateMutation.mutate({ displayScale: scale })
          }}
          mode="exclusive"
          aria-label="Échelle d'affichage"
        />
      </SettingsSection>

      <SettingsSection
        title="Pondération des critères"
        description="Ajustez l'importance de chaque critère dans le calcul de la note finale. Un poids de 0 ignore le critère."
      >
        <div className="pref-weights-list">
          {Object.entries(criteriaLabels).map(([key, label]) => (
            <div key={key} className="pref-weight-item">
              <div className="pref-weight-info">
                <span className="pref-weight-label">{label}</span>
                <span className="pref-weight-value">
                  ×{prefs.criteriaWeights[key as keyof typeof prefs.criteriaWeights]}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={prefs.criteriaWeights[key as keyof typeof prefs.criteriaWeights]}
                onChange={(e) => handleWeightChange(key, parseInt(e.target.value, 10))}
                className="pref-weight-slider"
                aria-label={`Pondération ${label}`}
              />
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Palette (mode clair)"
        description="Choisissez la palette de couleurs pour le mode clair."
      >
        <div className="pref-palette-swatches" role="radiogroup" aria-label="Palette de couleurs">
          {PALETTE_SWATCHES.map(({ variant: v, label, color }) => {
            const isChecked = variant === v
            return (
              <label key={v} className="pref-palette-swatch">
                <input
                  type="radio"
                  name="variant"
                  className="sr-only"
                  checked={isChecked}
                  onChange={() => setVariant(v)}
                />
                <span className="pref-palette-swatch__circle" style={{ backgroundColor: color }} />
                <span className="pref-palette-swatch__label">{label}</span>
              </label>
            )
          })}
        </div>
      </SettingsSection>
    </div>
  )
}
