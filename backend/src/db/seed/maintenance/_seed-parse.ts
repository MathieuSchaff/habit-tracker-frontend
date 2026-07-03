// Shared helpers for the product-seed maintenance scripts.
// Line-based (not AST) so edits keep the original formatting.

import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

export type Entry = {
  start: number
  end: number
  slug: string
  name: string
  brand: string
}

export function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (entry.endsWith('.seed.ts')) out.push(full)
  }
  return out
}

export function parseEntries(text: string): Entry[] {
  const lines = text.split('\n')
  const entries: Entry[] = []
  let depth = 0
  let entryDepth = -1
  let start = -1
  let slug = ''
  let name = ''
  let brand = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const opens = (line.match(/\{/g) ?? []).length
    const closes = (line.match(/\}/g) ?? []).length

    if (entryDepth === -1 && /^\s{2}\{\s*$/.test(line)) {
      entryDepth = depth
      start = i
      slug = ''
      name = ''
      brand = ''
    }

    if (entryDepth !== -1) {
      const slugM = line.match(/^\s+slug:\s*['"]([^'"]+)['"]/)
      const nameM = line.match(/^\s+name:\s*(?:'([^']+)'|"([^"]+)")/)
      const brandM = line.match(/^\s+brand:\s*['"]([^'"]+)['"]/)
      if (slugM && !slug) slug = slugM[1] ?? ''
      if (nameM && !name) name = nameM[1] ?? nameM[2] ?? ''
      if (brandM && !brand) brand = brandM[1] ?? ''
    }

    depth += opens - closes

    if (entryDepth !== -1 && depth === entryDepth && /^\s{2}\},?\s*$/.test(line)) {
      if (slug && name && brand) {
        entries.push({ start, end: i, slug, name, brand })
      }
      entryDepth = -1
      start = -1
    }
  }
  return entries
}

export function dropLines(text: string, ranges: Array<{ start: number; end: number }>): string {
  const lines = text.split('\n')
  const sorted = [...ranges].sort((a, b) => b.start - a.start)
  for (const r of sorted) {
    lines.splice(r.start, r.end - r.start + 1)
  }
  return lines.join('\n')
}
