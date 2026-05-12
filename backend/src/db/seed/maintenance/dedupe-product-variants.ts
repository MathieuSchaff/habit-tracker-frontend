#!/usr/bin/env bun
/**
 * dedupe-product-variants.ts — Drop volume-variant duplicates from seed files.
 *
 * Detects entries sharing (lower(name), lower(brand)) inside the same seed file,
 * then drops "non-canonical" entries whose slug carries a volume / pack suffix
 * (e.g. -400ml, -100g, -eco-recharge, -2-x). Only drops when a single canonical
 * entry exists in the group — ambiguous cases (no canonical, or multiple
 * canonicals) are reported and skipped.
 *
 * Usage:
 *   bun run backend/src/db/seed/maintenance/dedupe-product-variants.ts --dry
 *   bun run backend/src/db/seed/maintenance/dedupe-product-variants.ts
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DRY = process.argv.includes('--dry')
const SEED_ROOT = join(import.meta.dir, '..')
const PRODUCTS_DIR = join(SEED_ROOT, 'data', 'products')

const SUFFIX_RE =
  /-(?:\d+(?:[.,]\d+)?(?:ml|cl|l|g|kg|oz)|eco-recharge|recharge|\d+-x|x-\d+|lot-de-\d+|serum-offert|coffret|promo)$/i

const VOLUME_RE = /-(\d+(?:[.,]\d+)?)(ml|cl|l|g|kg)$/i

function extractVolumeMl(slug: string): number {
  const m = slug.match(VOLUME_RE)
  if (!m) return Number.POSITIVE_INFINITY
  const v = parseFloat((m[1] ?? '0').replace(',', '.'))
  const unit = (m[2] ?? '').toLowerCase()
  switch (unit) {
    case 'ml':
    case 'g':
      return v
    case 'cl':
      return v * 10
    case 'l':
    case 'kg':
      return v * 1000
    default:
      return v
  }
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

function dropLines(text: string, ranges: Array<{ start: number; end: number }>): string {
  const lines = text.split('\n')
  const sorted = [...ranges].sort((a, b) => b.start - a.start)
  for (const r of sorted) {
    lines.splice(r.start, r.end - r.start + 1)
  }
  return lines.join('\n')
}

const files = walk(PRODUCTS_DIR)
console.log(`scanning ${files.length} seed files…\n`)

let totalDropped = 0
let totalSkipped = 0
const skipped: string[] = []
const droppedSlugs: string[] = []

for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const entries = parseEntries(text)

  const groups = new Map<string, Entry[]>()
  for (const e of entries) {
    const key = `${e.name.toLowerCase()}|${e.brand.toLowerCase()}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)?.push(e)
  }

  const toDrop: Entry[] = []
  for (const [key, list] of groups) {
    if (list.length < 2) continue
    const canonical = list.filter((e) => !SUFFIX_RE.test(e.slug))
    const variants = list.filter((e) => SUFFIX_RE.test(e.slug))

    if (canonical.length === 1 && variants.length >= 1) {
      toDrop.push(...variants)
    } else if (canonical.length === 0 && variants.length >= 2) {
      // No canonical → keep the smallest volume, drop the rest.
      const sized = variants
        .map((e) => ({ e, vol: extractVolumeMl(e.slug) }))
        .sort((a, b) => a.vol - b.vol)
      const keep = sized[0]?.e
      for (const { e } of sized) if (e !== keep) toDrop.push(e)
    } else {
      skipped.push(
        `  ${file.replace(PRODUCTS_DIR, '.')}\n    [${key}] canonical=${canonical.length} variants=${variants.length}`
      )
      totalSkipped++
    }
  }

  if (toDrop.length === 0) continue

  console.log(`${file.replace(PRODUCTS_DIR, '.')}`)
  for (const e of toDrop) {
    console.log(`  drop ${e.slug} (${e.name} / ${e.brand})  L${e.start + 1}-${e.end + 1}`)
    droppedSlugs.push(e.slug)
    totalDropped++
  }

  if (!DRY) {
    const next = dropLines(text, toDrop)
    writeFileSync(file, next)
  }
}

if (!DRY && droppedSlugs.length > 0) {
  const outFile = join(SEED_ROOT, 'output', 'dedupe-dropped.json')
  writeFileSync(outFile, `${JSON.stringify(droppedSlugs, null, 2)}\n`)
  console.log(`\nlogged ${droppedSlugs.length} dropped slugs → output/dedupe-dropped.json`)
}

console.log(`\n${DRY ? '[DRY] would drop' : 'dropped'}: ${totalDropped}`)
console.log(`skipped (manual review): ${totalSkipped}`)
if (skipped.length > 0) {
  console.log('\n--- ambiguous groups (skipped) ---')
  for (const s of skipped) console.log(s)
}
