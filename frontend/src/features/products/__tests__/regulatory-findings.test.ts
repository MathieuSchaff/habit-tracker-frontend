import { describe, expect, it } from 'vitest'

import { formatRegulatoryFindings } from '../components/FormulaReading/regulatoryFindings'

// Minimal RegulatoryFinding shape the renderer reads; the lib emits richer
// records that the RPC payload carries structurally.
const finding = (over: {
  status?: 'restricted' | 'prohibited' | 'concentration_limit'
  region?: string
  subjectIngredients?: string[]
  matchedIngredients?: string[]
  maxConcentrationPct?: number
  detail?: string
  note?: string
}) => ({
  status: over.status ?? 'restricted',
  region: over.region ?? 'EU',
  subjectIngredients: over.subjectIngredients ?? [],
  matchedIngredients: over.matchedIngredients ?? [],
  maxConcentrationPct: over.maxConcentrationPct,
  detail: over.detail,
  note: over.note ?? '',
})

describe('formatRegulatoryFindings', () => {
  it('groups curated EU + Canada restrictions on one line per ingredient', () => {
    const lines = formatRegulatoryFindings([
      finding({ region: 'EU', detail: 'max 2%', subjectIngredients: ['Sodium Hydroxide'] }),
      finding({ region: 'CA', subjectIngredients: ['Sodium Hydroxide'] }),
    ])
    expect(lines).toEqual([
      {
        key: 'Sodium Hydroxide',
        label: 'Sodium Hydroxide',
        text: ' — usage encadré : UE (max 2 %), Canada',
      },
    ])
  })

  it('translates leave-on/rinse-off and annex references in details', () => {
    const lines = formatRegulatoryFindings([
      finding({
        region: 'EU',
        detail: 'max 2%, 2% leave-on / 3% rinse-off per Annex III/98',
        subjectIngredients: ['Salicylic Acid'],
      }),
    ])
    expect(lines[0]?.text).toBe(
      ' — usage encadré : UE (max 2 %, 2 % sans rinçage / 3 % à rincer, annexe III/98)'
    )
  })

  it('renders prohibitions before restrictions for the same ingredient', () => {
    const lines = formatRegulatoryFindings([
      finding({ status: 'prohibited', region: 'EU', subjectIngredients: ['Hydroquinone'] }),
      finding({ region: 'CA', detail: 'max 2%', subjectIngredients: ['Hydroquinone'] }),
    ])
    expect(lines).toEqual([
      {
        key: 'Hydroquinone',
        label: 'Hydroquinone',
        text: ' — interdit : UE · usage encadré : Canada (max 2 %)',
      },
    ])
  })

  it('folds concentration_limit into framed usage', () => {
    const lines = formatRegulatoryFindings([
      finding({
        status: 'concentration_limit',
        region: 'EU',
        maxConcentrationPct: 0.3,
        subjectIngredients: ['Retinol'],
      }),
    ])
    expect(lines[0]?.text).toBe(' — usage encadré : UE (max 0.3 %)')
  })

  it('classifies only subject ingredients, not rule conditions', () => {
    const lines = formatRegulatoryFindings([
      finding({
        region: 'EU',
        subjectIngredients: ['Kojic Acid'],
        matchedIngredients: ['Kojic Acid', 'Ascorbic Acid'],
      }),
    ])
    expect(lines).toEqual([
      { key: 'Kojic Acid', label: 'Kojic Acid', text: ' — usage encadré : UE' },
    ])
  })

  it('falls back to the raw note when no ingredient is attributable', () => {
    const lines = formatRegulatoryFindings([
      finding({ region: 'EU', subjectIngredients: ['Parfum'] }),
      finding({ subjectIngredients: [], matchedIngredients: [], note: 'Unattributable note.' }),
    ])
    expect(lines).toEqual([
      { key: 'Parfum', label: 'Parfum', text: ' — usage encadré : UE' },
      { key: 'Unattributable note.', text: 'Unattributable note.' },
    ])
  })

  it('keeps non-primary regions as raw codes', () => {
    const lines = formatRegulatoryFindings([
      finding({ status: 'prohibited', region: 'US', subjectIngredients: ['Mercury'] }),
    ])
    expect(lines[0]?.text).toBe(' — interdit : US')
  })
})
