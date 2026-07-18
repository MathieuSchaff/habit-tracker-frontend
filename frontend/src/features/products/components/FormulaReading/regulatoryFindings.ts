// FR wording for algo-derm's typed regulatoryFindings (region, status, limit).
// The lib emits structured rules, not English prose, so phrasing stays a frontend
// concern. `note` is the passthrough when no ingredient is attributable.

type RegStatus = 'restricted' | 'prohibited' | 'concentration_limit'

// Structural subset of algo-derm's RegulatoryFinding: backend-only vendored dep,
// so the type reaches the frontend via the RPC payload, not an import.
interface RegulatoryFindingLike {
  status: RegStatus
  region: string
  subjectIngredients: string[]
  matchedIngredients: string[]
  maxConcentrationPct?: number
  detail?: string
  note: string
}

export interface RegulatoryLine {
  key: string
  label?: string
  text: string
}

const REGION_FR: Record<string, string> = {
  EU: 'UE',
  'the EU': 'UE',
  CA: 'Canada',
  Canada: 'Canada',
}

const regionFr = (region: string): string => REGION_FR[region] ?? region

const detailFr = (detail: string): string =>
  detail
    .replace(/(\d)%/g, '$1 %')
    .replace(/leave-on only/g, 'sans rinçage uniquement')
    .replace(/rinse-off only/g, 'à rincer uniquement')
    .replace(/leave-on/g, 'sans rinçage')
    .replace(/rinse-off/g, 'à rincer')
    .replace(/ per Annex /g, ', annexe ')
    .replace(/\bAnnex /g, 'annexe ')

interface Buckets {
  prohibited: string[]
  framed: string[]
}

// One line per ingredient, e.g. "Salicylic Acid — usage encadré : UE (max 2 %), Canada".
export function formatRegulatoryFindings(findings: RegulatoryFindingLike[]): RegulatoryLine[] {
  const grouped = new Map<string, Buckets>()
  const passthrough: string[] = []

  for (const finding of findings) {
    // Only subjects carry an ingredient-level treatment; other matched
    // ingredients are rule conditions. Fall back to matched, then to the note.
    const subjects =
      finding.subjectIngredients.length > 0
        ? finding.subjectIngredients
        : finding.matchedIngredients
    if (subjects.length === 0) {
      passthrough.push(finding.note)
      continue
    }

    const region = regionFr(finding.region)
    const detail =
      finding.detail ??
      (finding.maxConcentrationPct != null ? `max ${finding.maxConcentrationPct}%` : undefined)
    // concentration_limit is a framed usage with a number, not a distinct verdict.
    const framedText = detail ? `${region} (${detailFr(detail)})` : region

    for (const subject of subjects) {
      const bucket = grouped.get(subject) ?? { prohibited: [], framed: [] }
      if (finding.status === 'prohibited') {
        if (!bucket.prohibited.includes(region)) bucket.prohibited.push(region)
      } else if (!bucket.framed.includes(framedText)) {
        bucket.framed.push(framedText)
      }
      grouped.set(subject, bucket)
    }
  }

  const lines: RegulatoryLine[] = []
  for (const [ingredient, { prohibited, framed }] of grouped) {
    const segments: string[] = []
    if (prohibited.length > 0) segments.push(`interdit : ${prohibited.join(', ')}`)
    if (framed.length > 0) segments.push(`usage encadré : ${framed.join(', ')}`)
    if (segments.length === 0) continue
    lines.push({ key: ingredient, label: ingredient, text: ` — ${segments.join(' · ')}` })
  }

  for (const note of passthrough) lines.push({ key: note, text: note })

  return lines
}
