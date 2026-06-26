import { useQuery } from '@tanstack/react-query'
import { GitMerge, Info, Scale } from 'lucide-react'
import { useMemo } from 'react'

import { SectionHeader } from '@/component/Typography/SectionHeader/SectionHeader'
import { PROFILE_RELEVANT_AXES, RISK_AXIS_PHRASE } from '@/constants/derm'
import { productQueries } from '@/lib/queries/products'
import { formatRegulatoryNotes } from './regulatoryNotes'
import './FormulaReading.css'

type RiskAxis = keyof typeof RISK_AXIS_PHRASE

interface FormulaReadingProps {
  slug: string
  userKey: string | null
  profileSlugs: ReadonlySet<string>
}

// Reads the algo-derm assessment and surfaces it calmly: known signals and their
// reason, never a score or low/medium/high verdict (excluded by the product vision).
export function FormulaReading({ slug, userKey, profileSlugs }: FormulaReadingProps) {
  const { data: assessment, isError } = useQuery(productQueries.dermoScore(slug, userKey))

  const relevantAxes = useMemo(() => {
    const axes = new Set<RiskAxis>()
    for (const s of profileSlugs) {
      for (const axis of PROFILE_RELEVANT_AXES[s] ?? []) axes.add(axis)
    }
    return axes
  }, [profileSlugs])

  if (isError || !assessment) return null

  const { explanation, regulatoryNotes, interactions, coverage } = assessment
  // Keep ingredient/heuristic signals only; interaction rules render in their own
  // section with a human note (their topDrivers label is a raw rule id). Drop drivers
  // with no axis — matched evidence that carries no concern is noise here.
  const drivers = explanation.topDrivers.filter(
    (d) => d.source !== 'interaction' && d.axes.length > 0
  )
  const hasSignal = drivers.length > 0 || regulatoryNotes.length > 0 || interactions.length > 0

  if (!hasSignal) return null

  return (
    <section className="formula-reading product-section">
      <SectionHeader title="Lecture de la formule" as="h2" />

      {drivers.length > 0 && (
        <div className="formula-reading__group">
          <h3 className="formula-reading__subhead">À noter dans cette formule</h3>
          <ul role="list" className="formula-reading__list">
            {drivers.map((d) => {
              const axes = d.axes as RiskAxis[]
              const relevant = axes.some((a) => relevantAxes.has(a))
              const phrase = axes
                .map((a) => RISK_AXIS_PHRASE[a])
                .filter(Boolean)
                .join(', ')
              return (
                <li
                  key={`${d.label}-${d.source}`}
                  className="formula-reading__item"
                  data-relevant={relevant || undefined}
                >
                  <span className="formula-reading__label">{d.label}</span>
                  {phrase && <span className="formula-reading__phrase"> — {phrase}</span>}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {regulatoryNotes.length > 0 && (
        <div className="formula-reading__group">
          <h3 className="formula-reading__subhead">
            <Scale size={13} aria-hidden="true" />
            Cadre réglementaire
          </h3>
          <p className="formula-reading__explainer">
            Limites officielles de concentration ou d'usage — courant pour les actifs réglementés.
          </p>
          <ul role="list" className="formula-reading__list">
            {formatRegulatoryNotes(regulatoryNotes).map((line) => (
              <li key={line.key} className="formula-reading__item">
                {line.label && <span className="formula-reading__label">{line.label}</span>}
                <span className="formula-reading__phrase">{line.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {interactions.length > 0 && (
        <div className="formula-reading__group">
          <h3 className="formula-reading__subhead">
            <GitMerge size={13} aria-hidden="true" />
            Interactions
          </h3>
          <ul role="list" className="formula-reading__list">
            {interactions.map((i) => (
              <li key={i.id} className="formula-reading__item">
                {i.note}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="formula-reading__footnote">
        <Info size={12} aria-hidden="true" />
        Estimation sur {coverage.matched} ingrédient{coverage.matched > 1 ? 's' : ''} reconnu
        {coverage.matched > 1 ? 's' : ''} sur {coverage.total} · pas un avis médical.
      </p>
    </section>
  )
}
