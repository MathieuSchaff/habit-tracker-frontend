#!/usr/bin/env bun
/**
 * Drop volume-variant duplicates from seed files: entries sharing
 * (lower(name), lower(brand)) whose slug carries a volume/pack suffix.
 * Only drops when the group has one canonical entry; ambiguous groups
 * are reported and skipped.
 *
 * Usage:
 *   bun run backend/src/db/seed/maintenance/dedupe-product-variants.ts          # dry-run
 *   bun run backend/src/db/seed/maintenance/dedupe-product-variants.ts --write  # apply
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { dropLines, type Entry, parseEntries, walk } from './_seed-parse'

const WRITE = process.argv.includes('--write')
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

  if (WRITE) {
    const next = dropLines(text, toDrop)
    writeFileSync(file, next)
  }
}

if (WRITE && droppedSlugs.length > 0) {
  const outDir = join(SEED_ROOT, 'output')
  mkdirSync(outDir, { recursive: true })
  const outFile = join(outDir, 'dedupe-dropped.json')
  writeFileSync(outFile, `${JSON.stringify(droppedSlugs, null, 2)}\n`)
  console.log(`\nlogged ${droppedSlugs.length} dropped slugs → output/dedupe-dropped.json`)
}

console.log(`\n${WRITE ? 'dropped' : '[DRY] would drop'}: ${totalDropped}`)
console.log(`skipped (manual review): ${totalSkipped}`)
if (skipped.length > 0) {
  console.log('\n--- ambiguous groups (skipped) ---')
  for (const s of skipped) console.log(s)
}
