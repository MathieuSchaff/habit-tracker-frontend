import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { GitMerge, Info, Scale, Sparkles } from 'lucide-react'
import { useMemo } from 'react'

import { SectionHeader } from '@/component/Typography/SectionHeader/SectionHeader'
import {
  BENEFIT_AXIS_PHRASE,
  CONFIDENCE_FACTOR_PHRASE,
  DOSE_SIGNAL_MIN_CONFIDENCE,
  DOSE_SIGNAL_MIN_DOSE_FACTOR,
  DOSE_SIGNAL_PHRASE,
  NO_SIGNAL_PHRASE,
  PROFILE_RELEVANT_AXES,
  RISK_AXIS_PHRASE,
} from '@/constants/derm'
import { productQueries } from '@/lib/queries/products'
import { formatRegulatoryNotes } from './regulatoryNotes'
import './FormulaReading.css'

type RiskAxis = keyof typeof RISK_AXIS_PHRASE
type BenefitAxis = keyof typeof BENEFIT_AXIS_PHRASE

// Unresolved labels (~35%) are the norm, not an error: plain text on purpose,
// never a link to an empty search page.
function DriverLabel({ label, slug }: { label: string; slug: string | null }) {
  if (!slug) return <span className="formula-reading__label">{label}</span>
  return (
    <Link
      to="/ingredients/$slug"
      params={{ slug }}
      className="formula-reading__label formula-reading__label--link"
    >
      {label}
    </Link>
  )
}

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

  // Loading and errors stay silent; an assessed formula with nothing to
  // surface must say so instead (a mute vanish reads the same as a failure).
  if (isError || !assessment) return null

  const { explanation, regulatoryNotes, interactions, coverage, matchedEvidence } = assessment
  // roleAtDose exists only for ingredients with an authored role curve (today:
  // exfoliants); absence means "no dose signal", not "not dosed to act".
  // Bundle INCI can repeat one inci at different doses while rendered drivers
  // are deduped upstream: every occurrence must pass the cut, silence otherwise.
  const dosedInci = new Map<string, boolean>()
  for (const m of matchedEvidence) {
    const pass =
      !!m.roleAtDose &&
      m.roleAtDose.doseFactor >= DOSE_SIGNAL_MIN_DOSE_FACTOR &&
      m.roleAtDose.confidence >= DOSE_SIGNAL_MIN_CONFIDENCE
    dosedInci.set(m.inci, (dosedInci.get(m.inci) ?? true) && pass)
  }
  // Keep ingredient/heuristic signals only; interaction rules render in their own
  // section with a human note (their topDrivers label is a raw rule id). Drop drivers
  // with no axis — matched evidence that carries no concern is noise here.
  const drivers = explanation.topDrivers.filter(
    (d) => d.source !== 'interaction' && d.axes.length > 0
  )
  // Benefit drivers carry no `source` and are never interaction-derived; keep all.
  const benefitDrivers = explanation.topBenefitDrivers.filter((d) => d.axes.length > 0)
  const hasSignal =
    benefitDrivers.length > 0 ||
    drivers.length > 0 ||
    regulatoryNotes.length > 0 ||
    interactions.length > 0

  const caveats = explanation.confidenceFactors
    .map((f) => CONFIDENCE_FACTOR_PHRASE[f.factor])
    .filter((phrase): phrase is string => !!phrase)

  return (
    <section className="formula-reading product-section">
      <SectionHeader title="Lecture de la formule" as="h2" />

      {!hasSignal && <p className="formula-reading__empty">{NO_SIGNAL_PHRASE}</p>}

      {benefitDrivers.length > 0 && (
        <div className="formula-reading__group">
          <h3 className="formula-reading__subhead">
            <Sparkles size={13} aria-hidden="true" />
            Points forts
          </h3>
          <ul role="list" className="formula-reading__list">
            {benefitDrivers.map((d) => {
              const phrase = (d.axes as BenefitAxis[])
                .map((a) => BENEFIT_AXIS_PHRASE[a])
                .filter(Boolean)
                .join(', ')
              return (
                <li key={d.label} className="formula-reading__item">
                  <DriverLabel label={d.label} slug={d.ingredientSlug} />
                  {phrase && <span className="formula-reading__phrase"> — {phrase}</span>}
                  {d.inci && dosedInci.get(d.inci) && (
                    <span className="formula-reading__dose-tag">{DOSE_SIGNAL_PHRASE}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

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
                  <DriverLabel label={d.label} slug={d.ingredientSlug} />
                  {phrase && <span className="formula-reading__phrase"> — {phrase}</span>}
                  {d.inci && dosedInci.get(d.inci) && (
                    <span className="formula-reading__dose-tag">{DOSE_SIGNAL_PHRASE}</span>
                  )}
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

      {caveats.length > 0 && (
        <div className="formula-reading__caveats">
          {caveats.map((phrase) => (
            <p key={phrase} className="formula-reading__caveat">
              {phrase}
            </p>
          ))}
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
