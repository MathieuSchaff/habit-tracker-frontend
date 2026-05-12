#!/usr/bin/env bun
/**
 * disambiguate-product-names.ts — Append slug-tail parenthetical to name when
 * (name, brand) collides between several seed entries that have NO volume
 * suffix. Idempotent: skips entries whose name already ends with `(...)`.
 *
 * Usage:
 *   bun run backend/src/db/seed/maintenance/disambiguate-product-names.ts --dry
 *   bun run backend/src/db/seed/maintenance/disambiguate-product-names.ts
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DRY = process.argv.includes('--dry')
const SEED_ROOT = join(import.meta.dir, '..')
const PRODUCTS_DIR = join(SEED_ROOT, 'data', 'products')

// Words requiring French accent restoration (slugs are ASCII).
const ACCENT_RESTORE: Record<string, string> = {
  apres: 'Après',
  apaisant: 'Apaisant',
  apaisante: 'Apaisante',
  doree: 'Dorée',
  dore: 'Doré',
  efficacite: 'Efficacité',
  legere: 'Légère',
  leger: 'Léger',
  seche: 'Sèche',
  seches: 'Sèches',
  toucher: 'Toucher',
}

type Entry = {
  start: number
  end: number
  slug: string
  name: string
  brand: string
}

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (entry.endsWith('.seed.ts')) out.push(full)
  }
  return out
}

function parseEntries(text: string): Entry[] {
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

function commonSegmentPrefix(strs: string[]): string[] {
  if (strs.length === 0) return []
  const segs = strs.map((s) => s.split('-'))
  const out: string[] = []
  const minLen = Math.min(...segs.map((a) => a.length))
  for (let i = 0; i < minLen; i++) {
    const first = segs[0]?.[i]
    if (segs.every((a) => a[i] === first)) out.push(first as string)
    else break
  }
  return out
}

function titleWord(w: string): string {
  const lower = w.toLowerCase()
  if (lower in ACCENT_RESTORE) return ACCENT_RESTORE[lower] as string
  if (/^\d+$/.test(lower)) return lower
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function tailToLabel(tail: string): string {
  if (!tail) return ''
  return tail.split('-').map(titleWord).join(' ')
}

const files = walk(PRODUCTS_DIR)
console.log(`scanning ${files.length} seed files…\n`)

let totalPatched = 0
const skipped: string[] = []

for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const entries = parseEntries(text)
  const lines = text.split('\n')

  const groups = new Map<string, Entry[]>()
  for (const e of entries) {
    const key = `${e.name.toLowerCase()}|${e.brand.toLowerCase()}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)?.push(e)
  }

  const patches: Array<{ line: number; from: string; to: string; slug: string }> = []

  for (const [key, list] of groups) {
    if (list.length < 2) continue

    // Skip groups already disambiguated (any name ends with parenthetical).
    if (list.some((e) => /\([^)]+\)\s*$/.test(e.name))) {
      skipped.push(`  ${file.replace(PRODUCTS_DIR, '.')} [${key}] already disambiguated`)
      continue
    }

    const prefixSegs = commonSegmentPrefix(list.map((e) => e.slug))
    const tails = list.map((e) => e.slug.split('-').slice(prefixSegs.length).join('-'))

    if (tails.every((t) => t === '')) {
      skipped.push(`  ${file.replace(PRODUCTS_DIR, '.')} [${key}] no diff tail (identical slugs?)`)
      continue
    }

    for (let i = 0; i < list.length; i++) {
      const entry = list[i]
      if (!entry) continue
      const tail = tails[i] ?? ''
      if (!tail) continue

      const label = tailToLabel(tail)
      const newName = `${entry.name} (${label})`

      // Find the name: line within entry range. Handle both ' and " quotes.
      for (let l = entry.start; l <= entry.end; l++) {
        const ln = lines[l] ?? ''
        const lmS = ln.match(/^(\s+name:\s*')([^']+)('.*)$/)
        const lmD = ln.match(/^(\s+name:\s*")([^"]+)(".*)$/)
        const lm = lmS ?? lmD
        if (lm) {
          // If name contains apostrophe, must use double quotes.
          const useDouble = newName.includes("'")
          const open = useDouble ? '"' : "'"
          const close = useDouble ? '"' : "'"
          const head = (lm[1] ?? '').replace(/['"]$/, open)
          const tail = (lm[3] ?? '').replace(/^['"]/, close)
          patches.push({
            line: l,
            from: ln,
            to: `${head}${newName}${tail}`,
            slug: entry.slug,
          })
          break
        }
      }
    }
  }

  if (patches.length === 0) continue

  console.log(`${file.replace(PRODUCTS_DIR, '.')}`)
  for (const p of patches) {
    const oldName = p.from.match(/name:\s*'([^']+)'/)?.[1] ?? ''
    const newName = p.to.match(/name:\s*'([^']+)'/)?.[1] ?? ''
    console.log(`  L${p.line + 1}  ${p.slug}\n    "${oldName}"\n    → "${newName}"`)
    totalPatched++
  }

  if (!DRY) {
    for (const p of patches) lines[p.line] = p.to
    writeFileSync(file, lines.join('\n'))
  }
}

console.log(`\n${DRY ? '[DRY] would patch' : 'patched'}: ${totalPatched}`)
if (skipped.length > 0) {
  console.log(`skipped: ${skipped.length}`)
  for (const s of skipped.slice(0, 10)) console.log(s)
}
