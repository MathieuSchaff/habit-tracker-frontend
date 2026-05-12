#!/usr/bin/env bun
/**
 * scan-db-duplicates.ts — DB-wide duplicate scanner.
 *
 * Catches dup patterns the seed-file audit can't see (Atoderm-style: products
 * sit in DB only, no seed entry). Pulls (slug, name, brand, kind, inci,
 * imageUrl, totalAmount, amountUnit) from a backup SQL file (avoids hitting
 * the live DB and keeps results stable across re-runs).
 *
 * Reports four signals:
 *   1. Slug typos    : repeated slug fragments ("gel-douche-gel-douche")
 *   2. Kit markers   : "...-et-eco-recharge-..." inside slug
 *   3. INCI clusters : same brand, INCI Jaccard ≥ 0.95, name Jaccard ≥ 0.6
 *   4. Refill pairs  : same brand+core-name, one entry has "eco-recharge" /
 *                      "famille" / "kit" / "lot-de-N", other doesn't
 *
 * Usage: bun run backend/src/db/seed/maintenance/scan-db-duplicates.ts <backup.sql>
 */

import { readFileSync } from 'node:fs'

const backupPath = process.argv[2]
if (!backupPath) {
  console.error('Usage: scan-db-duplicates.ts <backup.sql>')
  process.exit(1)
}

const sql = readFileSync(backupPath, 'utf8')
const startMatch = sql.match(/^COPY public\.products \([^)]*\) FROM stdin;\n/m)
if (!startMatch) {
  console.error('No COPY public.products block in backup')
  process.exit(1)
}
const start = sql.indexOf(startMatch[0]) + startMatch[0].length
const end = sql.indexOf('\n\\.\n', start)
const block = sql.slice(start, end)

type Row = {
  id: string
  name: string
  brand: string
  kind: string
  inci: string
  totalAmount: string
  amountUnit: string
  slug: string
  imageUrl: string | null
}

const rows: Row[] = []
for (const line of block.split('\n')) {
  if (!line) continue
  const c = line.split('\t')
  rows.push({
    id: c[0] ?? '',
    name: c[2] ?? '',
    brand: c[3] ?? '',
    kind: c[4] ?? '',
    inci: c[6] === '\\N' ? '' : (c[6] ?? ''),
    totalAmount: c[8] === '\\N' ? '' : (c[8] ?? ''),
    amountUnit: c[9] === '\\N' ? '' : (c[9] ?? ''),
    slug: c[10] ?? '',
    imageUrl: c[12] === '\\N' ? null : (c[12] ?? null),
  })
}

console.log(`Loaded ${rows.length} products from backup\n`)

// 1. Slug typos — same fragment repeated
const SLUG_TYPO_RE = /\b([a-z]{4,}(?:-[a-z]{2,})?)-\1\b/
const slugTypos: Row[] = []
for (const r of rows) {
  if (SLUG_TYPO_RE.test(r.slug)) slugTypos.push(r)
}

// 2. Kit/refill markers in slug
const KIT_RE = /-(?:famille-et|et-eco-recharge|kit|coffret|duo-pack|lot-de-\d+)-/
const kits: Row[] = rows.filter((r) => KIT_RE.test(r.slug))

// 3. INCI clusters — same brand, similar INCI, similar core name
function tokenizeInci(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/^.*ingredients?\s*:/i, '')
      .split(/[,;•·.]/)
      .map((t) => t.replace(/[^a-z0-9]/g, ''))
      .filter((t) => t.length > 1)
  )
}
function nameKey(n: string): Set<string> {
  return new Set(
    n
      .toLowerCase()
      .replace(/\b\d+(?:[.,]\d+)?\s*(?:ml|cl|l|g|kg|oz)\b/g, '')
      .replace(
        /\b(eco[-\s]?recharge|recharge|format|nomade|lot|pack|x\s*\d+|de\s+\d+|flacon|kit|duo|famille|et)\b/g,
        ''
      )
      .split(/\s+/)
      .map((t) => t.replace(/[^a-z0-9]/g, ''))
      .filter((t) => t.length > 2)
  )
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}

// Index rows by brand for O(N²/B) instead of O(N²)
const byBrand = new Map<string, Row[]>()
for (const r of rows) {
  const key = r.brand.toLowerCase().trim()
  if (!byBrand.has(key)) byBrand.set(key, [])
  byBrand.get(key)?.push(r)
}

type Pair = { a: Row; b: Row; jInci: number; jName: number }
const inciPairs: Pair[] = []
for (const [, brandRows] of byBrand) {
  if (brandRows.length < 2) continue
  const cached = brandRows.map((r) => ({ r, inci: tokenizeInci(r.inci), name: nameKey(r.name) }))
  for (let i = 0; i < cached.length; i++) {
    for (let j = i + 1; j < cached.length; j++) {
      const a = cached[i]
      const b = cached[j]
      if (!a || !b) continue
      if (a.inci.size < 5 || b.inci.size < 5) continue
      const jInci = jaccard(a.inci, b.inci)
      if (jInci < 0.95) continue
      const jName = jaccard(a.name, b.name)
      if (jName < 0.6) continue
      inciPairs.push({ a: a.r, b: b.r, jInci, jName })
    }
  }
}

// 4. Refill pairs — same brand, same core name (volumes/markers stripped),
// one has refill marker, other doesn't
const REFILL_MARKERS = /\b(eco[-\s]?recharge|recharge|kit|coffret|famille|duo-pack)\b/i
function coreName(n: string): string {
  return n
    .toLowerCase()
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:ml|cl|l|g|kg|oz)\b/g, '')
    .replace(REFILL_MARKERS, '')
    .replace(/\s+/g, ' ')
    .trim()
}
const refillPairs: Pair[] = []
for (const [, brandRows] of byBrand) {
  if (brandRows.length < 2) continue
  const groups = new Map<string, Row[]>()
  for (const r of brandRows) {
    const key = `${coreName(r.name)}::${r.kind}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)?.push(r)
  }
  for (const [, list] of groups) {
    if (list.length < 2) continue
    const refills = list.filter((r) => REFILL_MARKERS.test(r.name) || REFILL_MARKERS.test(r.slug))
    const bases = list.filter((r) => !REFILL_MARKERS.test(r.name) && !REFILL_MARKERS.test(r.slug))
    for (const a of bases) {
      for (const b of refills) {
        const jInci = a.inci && b.inci ? jaccard(tokenizeInci(a.inci), tokenizeInci(b.inci)) : 0
        refillPairs.push({ a, b, jInci, jName: 1 })
      }
    }
  }
}

console.log(`## Slug typos (${slugTypos.length})`)
for (const r of slugTypos) console.log(`  ${r.slug}`)

console.log(`\n## Kit / refill marker in slug (${kits.length})`)
for (const r of kits.slice(0, 30)) console.log(`  ${r.slug}`)
if (kits.length > 30) console.log(`  ... ${kits.length - 30} more`)

console.log(`\n## INCI clusters — Jaccard INCI≥0.95 + name≥0.6 (${inciPairs.length})`)
for (const p of inciPairs.slice(0, 50)) {
  console.log(`  J(inci)=${p.jInci.toFixed(2)} J(name)=${p.jName.toFixed(2)}`)
  console.log(`    ${p.a.slug}`)
  console.log(`    ${p.b.slug}`)
}
if (inciPairs.length > 50) console.log(`  ... ${inciPairs.length - 50} more`)

console.log(`\n## Refill pairs — same core name, base+refill (${refillPairs.length})`)
for (const p of refillPairs.slice(0, 30)) {
  console.log(`  J(inci)=${p.jInci.toFixed(2)}`)
  console.log(`    BASE   ${p.a.slug}`)
  console.log(`    REFILL ${p.b.slug}`)
}
if (refillPairs.length > 30) console.log(`  ... ${refillPairs.length - 30} more`)

// Emit JSON sidecar for downstream tooling
const out = {
  generatedAt: new Date().toISOString(),
  slugTypos: slugTypos.map((r) => ({
    slug: r.slug,
    name: r.name,
    brand: r.brand,
    imageUrl: r.imageUrl,
  })),
  kitsInSlug: kits.map((r) => ({
    slug: r.slug,
    name: r.name,
    brand: r.brand,
    imageUrl: r.imageUrl,
  })),
  inciPairs: inciPairs.map((p) => ({
    a: { slug: p.a.slug, name: p.a.name, brand: p.a.brand, imageUrl: p.a.imageUrl },
    b: { slug: p.b.slug, name: p.b.name, brand: p.b.brand, imageUrl: p.b.imageUrl },
    jInci: p.jInci,
    jName: p.jName,
  })),
  refillPairs: refillPairs.map((p) => ({
    base: { slug: p.a.slug, name: p.a.name, brand: p.a.brand, imageUrl: p.a.imageUrl },
    refill: { slug: p.b.slug, name: p.b.name, brand: p.b.brand, imageUrl: p.b.imageUrl },
    jInci: p.jInci,
  })),
}
const outPath = 'backend/src/db/seed/output/scan-db-duplicates.json'
require('node:fs').writeFileSync(outPath, JSON.stringify(out, null, 2))
console.log(`\nWrote ${outPath}`)
