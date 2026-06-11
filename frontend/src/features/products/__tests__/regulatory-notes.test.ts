import { describe, expect, it } from 'vitest'

import { formatRegulatoryNotes } from '../components/FormulaReading/regulatoryNotes'

describe('formatRegulatoryNotes', () => {
  it('groups curated EU + Canada restrictions on one line per ingredient', () => {
    const lines = formatRegulatoryNotes([
      'Ingredient Sodium Hydroxide has restrictions in the EU (max 2%).',
      'Ingredient Sodium Hydroxide has restrictions in Canada.',
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
    const lines = formatRegulatoryNotes([
      'Ingredient Salicylic Acid has restrictions in the EU (max 2%, 2% leave-on / 3% rinse-off per Annex III/98).',
    ])
    expect(lines[0]?.text).toBe(
      ' — usage encadré : UE (max 2 %, 2 % sans rinçage / 3 % à rincer, annexe III/98)'
    )
  })

  it('renders prohibitions before restrictions for the same ingredient', () => {
    const lines = formatRegulatoryNotes([
      'Ingredient Hydroquinone is prohibited in the EU.',
      'Ingredient Hydroquinone has restrictions in Canada (max 2%).',
    ])
    expect(lines).toEqual([
      {
        key: 'Hydroquinone',
        label: 'Hydroquinone',
        text: ' — interdit : UE · usage encadré : Canada (max 2 %)',
      },
    ])
  })

  it('parses lookup notes and drops the diagnostic CAS tail', () => {
    const lines = formatRegulatoryNotes([
      'TRICLOSAN: restricted in EU (max 0.3%, Annex V); prohibited in CA — matches CAS 3380-34-5 (Triclosan)',
    ])
    expect(lines).toEqual([
      {
        key: 'TRICLOSAN',
        label: 'TRICLOSAN',
        text: ' — interdit : Canada · usage encadré : UE (max 0.3 %, annexe V)',
      },
    ])
  })

  it('passes unknown shapes through untouched', () => {
    const raw = 'Some future note format we do not know yet.'
    const lines = formatRegulatoryNotes([raw, 'Ingredient Parfum has restrictions in the EU.'])
    expect(lines).toEqual([
      { key: 'Parfum', label: 'Parfum', text: ' — usage encadré : UE' },
      { key: raw, text: raw },
    ])
  })

  it('keeps non-primary prohibition regions as raw codes', () => {
    const lines = formatRegulatoryNotes(['Ingredient Mercury is prohibited in US.'])
    expect(lines[0]?.text).toBe(' — interdit : US')
  })

  it('accepts multi-word lookup regions', () => {
    const lines = formatRegulatoryNotes([
      'Lead Acetate: prohibited in New Zealand — matches CAS 301-04-2 (Lead acetate)',
    ])
    expect(lines[0]?.text).toBe(' — interdit : New Zealand')
  })
})
