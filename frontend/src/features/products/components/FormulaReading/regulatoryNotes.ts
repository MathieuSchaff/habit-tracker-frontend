// FR rendering of algo-derm regulatoryNotes. The lib emits English prose
// (engine/regulatory.ts: two curated templates + one lookup template);
// parsing the known shapes here keeps wording a frontend concern, like
// RISK_AXIS_PHRASE. Unknown shapes pass through untouched.

type RegKind = 'prohibited' | 'restricted'

interface RegEntry {
  kind: RegKind
  region: string
  detail?: string
}

export interface RegulatoryLine {
  key: string
  label?: string
  text: string
}

const CURATED_PROHIBITED = /^Ingredient (.+) is prohibited in (.+)\.$/
// Curated restricted notes only ever name the two primary regions; anything
// else means the lib changed and the note falls back to passthrough.
const CURATED_RESTRICTED = /^Ingredient (.+) has restrictions in (the EU|Canada)(?: \((.+)\))?\.$/
const LOOKUP_NOTE = /^(.+?): (.+) — matches CAS .+$/
const LOOKUP_FRAGMENT = /^(prohibited|restricted) in (.+?)(?: \((.+)\))?$/

const REGION_FR: Record<string, string> = {
  'the EU': 'UE',
  EU: 'UE',
  Canada: 'Canada',
  CA: 'Canada',
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

function parseNote(note: string): { ingredient: string; entries: RegEntry[] } | null {
  const restricted = CURATED_RESTRICTED.exec(note)
  if (restricted) {
    return {
      ingredient: restricted[1],
      entries: [{ kind: 'restricted', region: restricted[2], detail: restricted[3] }],
    }
  }

  const prohibited = CURATED_PROHIBITED.exec(note)
  if (prohibited) {
    return { ingredient: prohibited[1], entries: [{ kind: 'prohibited', region: prohibited[2] }] }
  }

  const lookup = LOOKUP_NOTE.exec(note)
  if (lookup) {
    const entries: RegEntry[] = []
    for (const fragment of lookup[2].split('; ')) {
      const f = LOOKUP_FRAGMENT.exec(fragment)
      if (!f) return null
      entries.push({ kind: f[1] as RegKind, region: f[2], detail: f[3] })
    }
    return { ingredient: lookup[1], entries }
  }

  return null
}

// One calm line per ingredient: "Salicylic Acid — usage encadré : UE (max 2 %), Canada".
export function formatRegulatoryNotes(notes: string[]): RegulatoryLine[] {
  const grouped = new Map<string, RegEntry[]>()
  const passthrough: string[] = []

  for (const note of notes) {
    const parsed = parseNote(note)
    if (!parsed) {
      passthrough.push(note)
      continue
    }
    const list = grouped.get(parsed.ingredient) ?? []
    list.push(...parsed.entries)
    grouped.set(parsed.ingredient, list)
  }

  const lines: RegulatoryLine[] = []
  for (const [ingredient, entries] of grouped) {
    const prohibited = entries.filter((e) => e.kind === 'prohibited')
    const restricted = entries.filter((e) => e.kind === 'restricted')
    const segments: string[] = []
    if (prohibited.length > 0) {
      segments.push(`interdit : ${prohibited.map((e) => regionFr(e.region)).join(', ')}`)
    }
    if (restricted.length > 0) {
      const regions = restricted.map((e) =>
        e.detail ? `${regionFr(e.region)} (${detailFr(e.detail)})` : regionFr(e.region)
      )
      segments.push(`usage encadré : ${regions.join(', ')}`)
    }
    lines.push({ key: ingredient, label: ingredient, text: ` — ${segments.join(' · ')}` })
  }

  for (const note of passthrough) {
    lines.push({ key: note, text: note })
  }

  return lines
}
