import { useQuery } from '@tanstack/react-query'

import { SectionHeader } from '@/component/Typography/SectionHeader/SectionHeader'
import { CONC_METHOD_NOTE, CONC_UNESTIMABLE_PHRASE } from '@/constants/derm'
import { productQueries } from '@/lib/queries/products'
import {
  type ConcentrationRead,
  compareConcentrationReads,
  formatConcentrationRead,
  readConcentration,
} from './estimate'
import './FormulaConcentrations.css'

interface FormulaConcentrationsProps {
  slug: string
  userKey: string | null
}

export function FormulaConcentrations({ slug, userKey }: FormulaConcentrationsProps) {
  const { data: assessment, isError } = useQuery(productQueries.dermoScore(slug, userKey))
  if (isError || !assessment) return null

  // Bundle formulas can repeat an INCI. Keep the strongest estimate.
  const byInci = new Map<string, { name: string; read: ConcentrationRead }>()
  for (const m of assessment.matchedEvidence) {
    const read = readConcentration(m.concentrationEstimate)
    const prev = byInci.get(m.inci)
    if (!prev || compareConcentrationReads(read, prev.read) < 0) {
      byInci.set(m.inci, { name: m.ingredient, read })
    }
  }

  const rows = [...byInci.entries()]
    .map(([inci, v]) => ({ inci, ...v }))
    .sort((a, b) => compareConcentrationReads(a.read, b.read))

  // FormulaReading already covers the qualitative-only case.
  if (!rows.some((r) => r.read.kind !== 'unestimable')) return null

  return (
    <section className="formula-concentrations product-section">
      <SectionHeader title="Concentrations estimées" as="h2">
        <span className="formula-concentrations__beta">expérimental</span>
      </SectionHeader>

      <p className="formula-concentrations__method">{CONC_METHOD_NOTE}</p>

      <ul role="list" className="formula-concentrations__list">
        {rows.map((r) => (
          <li key={r.inci} className="formula-concentrations__item">
            <span className="formula-concentrations__name">{r.name}</span>
            {r.read.kind === 'unestimable' ? (
              <span className="formula-concentrations__unestimable">{CONC_UNESTIMABLE_PHRASE}</span>
            ) : (
              <span
                className="formula-concentrations__value"
                data-declared={r.read.kind === 'declared' || undefined}
              >
                {formatConcentrationRead(r.read)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
