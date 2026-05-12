#!/usr/bin/env bun
/**
 * canonicalize-volume-variants.ts — Drop volume-variant duplicates (intra-file).
 *
 * Reads the latest audit-imported-products.json report and, for each
 * intra-source pair where INCI ≥ 0.95, name ≥ 0.85 and no blocking flag is
 * set (num-diff / tint-diff / gamme-letter), builds connected groups
 * (union-find) over the slugs in the same file. Each group with 2+ entries is
 * canonicalized: keep the largest-volume entry, drop the rest.
 *
 * Tie-break on equal volume: keep the first entry in source order.
 *
 * Usage:
 *   bun run backend/src/db/seed/maintenance/canonicalize-volume-variants.ts --dry
 *   bun run backend/src/db/seed/maintenance/canonicalize-volume-variants.ts
 *
 * Pre-req: run audit-imported-products.ts --write first.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DRY = process.argv.includes('--dry')
const SEED_ROOT = join(import.meta.dir, '..')
const AUDIT_PATH = join(SEED_ROOT, 'output', 'imported-products-audit.json')
const _PRODUCTS_DIR = join(SEED_ROOT, 'data', 'products')

const INCI_THRESHOLD = 0.95
const NAME_THRESHOLD = 0.85
const BLOCKING_FLAG_RE = /^(num-diff|tint-diff|gamme-letter)/

type AuditPair = {
  a: { file: string; slug: string; name: string; brand: string }
  b: { file: string; slug: string; name: string; brand: string }
  tier: string
  inci: number
  name: number
  score: number
  sameSize: boolean
  flags: string[]
}

type Entry = {
  start: number
  end: number
  slug: string
  totalAmount: number | null
  amountUnit: string | null
}

if (!existsSync(AUDIT_PATH)) {
  console.error(`Audit report not found: ${AUDIT_PATH}`)
  console.error('Run: bun run backend/src/db/seed/maintenance/audit-imported-products.ts --write')
  process.exit(1)
}

const audit = JSON.parse(readFileSync(AUDIT_PATH, 'utf8'))
const pairs: AuditPair[] = audit.intraSourceDuplicates ?? []

const candidatePairs = pairs.filter(
  (p) =>
    p.inci >= INCI_THRESHOLD &&
    p.name >= NAME_THRESHOLD &&
    !p.flags.some((f) => BLOCKING_FLAG_RE.test(f)) &&
    p.a.file === p.b.file
)

console.log(`audit pairs: ${pairs.length} → candidates: ${candidatePairs.length}`)

// Group pairs by file → union-find within each file
const byFile = new Map<string, AuditPair[]>()
for (const p of candidatePairs) {
  if (!byFile.has(p.a.file)) byFile.set(p.a.file, [])
  byFile.get(p.a.file)?.push(p)
}

// Volume parsing — fallback to slug when totalAmount/amountUnit unreliable
function volumeToMl(amount: number | null, unit: string | null, slug: string): number | null {
  const fromUnit = (() => {
    if (amount === null || unit === null) return null
    const u = unit.toLowerCase()
    switch (u) {
      case 'ml':
      case 'g':
        return amount
      case 'cl':
        return amount * 10
      case 'l':
      case 'kg':
        return amount * 1000
      default:
        return null
    }
  })()
  if (fromUnit !== null) return fromUnit

  const m = slug.match(/(\d+(?:[.,]\d+)?)[-_]?(ml|cl|l|g|kg)\b/i)
  if (!m) return null
  const v = parseFloat((m[1] ?? '0').replace(',', '.'))
  const u = (m[2] ?? '').toLowerCase()
  switch (u) {
    case 'ml':
    case 'g':
      return v
    case 'cl':
      return v * 10
    case 'l':
    case 'kg':
      return v * 1000
    default:
      return null
  }
}

function parseEntries(text: string): Entry[] {
  const lines = text.split('\n')
  const entries: Entry[] = []
  let depth = 0
  let entryDepth = -1
  let start = -1
  let cur: Partial<Entry> = {}

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const opens = (line.match(/\{/g) ?? []).length
    const closes = (line.match(/\}/g) ?? []).length

    if (entryDepth === -1 && /^\s{2}\{\s*$/.test(line)) {
      entryDepth = depth
      start = i
      cur = {}
    }

    if (entryDepth !== -1) {
      const slugM = line.match(/^\s+slug:\s*['"]([^'"]+)['"]/)
      const totalM = line.match(/^\s+totalAmount:\s*([0-9.]+)/)
      const unitM = line.match(/^\s+amountUnit:\s*['"]([^'"]+)['"]/)
      if (slugM && cur.slug === undefined) cur.slug = slugM[1]
      if (totalM && cur.totalAmount === undefined) cur.totalAmount = parseFloat(totalM[1] ?? '0')
      if (unitM && cur.amountUnit === undefined) cur.amountUnit = unitM[1] ?? null
    }

    depth += opens - closes

    if (entryDepth !== -1 && depth === entryDepth && /^\s{2}\},?\s*$/.test(line)) {
      if (cur.slug) {
        entries.push({
          start,
          end: i,
          slug: cur.slug,
          totalAmount: cur.totalAmount ?? null,
          amountUnit: cur.amountUnit ?? null,
        })
      }
      entryDepth = -1
    }
  }
  return entries
}

function dropLines(text: string, ranges: Array<{ start: number; end: number }>): string {
  const lines = text.split('\n')
  const sorted = [...ranges].sort((a, b) => b.start - a.start)
  for (const r of sorted) lines.splice(r.start, r.end - r.start + 1)
  return lines.join('\n')
}

// Repo-relative paths in the audit; need absolute for fs ops
const REPO_ROOT = join(SEED_ROOT, '..', '..', '..', '..')

let totalDropped = 0
let totalGroups = 0

for (const [relFile, filePairs] of byFile) {
  const absFile = join(REPO_ROOT, relFile)
  const text = readFileSync(absFile, 'utf8')
  const entries = parseEntries(text)
  const bySlug = new Map(entries.map((e) => [e.slug, e]))

  // Union-find over slugs
  const parent = new Map<string, string>()
  const find = (x: string): string => {
    const p = parent.get(x) ?? x
    if (p === x) return x
    const r = find(p)
    parent.set(x, r)
    return r
  }
  const union = (a: string, b: string) => {
    parent.set(find(a), find(b))
  }

  for (const p of filePairs) {
    parent.set(p.a.slug, p.a.slug)
    parent.set(p.b.slug, p.b.slug)
  }
  for (const p of filePairs) union(p.a.slug, p.b.slug)

  const groups = new Map<string, string[]>()
  for (const slug of parent.keys()) {
    const root = find(slug)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root)?.push(slug)
  }

  const toDrop: Entry[] = []
  console.log(`\n${relFile}`)

  for (const [_root, slugs] of groups) {
    if (slugs.length < 2) continue
    totalGroups++
    const items = slugs
      .map((s) => bySlug.get(s))
      .filter((e): e is Entry => e !== undefined)
      .map((e) => ({ e, vol: volumeToMl(e.totalAmount, e.amountUnit, e.slug) }))
      // Entries with null volume sort last so a sized entry wins; if all are null we keep first
      .sort((a, b) => (b.vol ?? -1) - (a.vol ?? -1) || a.e.start - b.e.start)

    const keep = items[0]?.e
    if (!keep) continue
    const drops = items.slice(1).map((x) => x.e)
    if (drops.length === 0) continue

    console.log(`  KEEP ${keep.slug} (${items[0]?.vol ?? '?'}ml)`)
    for (const d of items.slice(1)) {
      console.log(`  drop ${d.e.slug} (${d.vol ?? '?'}ml)`)
    }
    toDrop.push(...drops)
    totalDropped += drops.length
  }

  if (!DRY && toDrop.length > 0) {
    const next = dropLines(text, toDrop)
    writeFileSync(absFile, next)
  }
}

console.log(
  `\n${DRY ? '[DRY] would drop' : 'dropped'}: ${totalDropped} entries across ${totalGroups} groups in ${byFile.size} files`
)
