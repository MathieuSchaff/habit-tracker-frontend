#!/usr/bin/env bun
/**
 * audit-bunny-images.ts — Cross-check Bunny Storage inventory against the DB for
 * each image surface (products.image_url under products/, articles.cover_image_url
 * under blog/). Reports orphans (on Bunny, no DB ref), broken refs (DB url but
 * file absent), and reachability of a random sample.
 *
 * Required env: BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD, APP_DATABASE_URL (or DATABASE_URL).
 * Optional env: BUNNY_STORAGE_HOSTNAME (default storage.bunnycdn.com), IMAGE_CDN_BASE.
 */

import { SQL } from 'bun'

import { listBunny, resolveBunnyConfig } from '../lib/bunny'

const DB_URL = process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL
const base = resolveBunnyConfig()
if (!base.zone || !base.password || !DB_URL) {
  console.error('missing env: BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD, APP_DATABASE_URL')
  process.exit(1)
}

const sql = new SQL(DB_URL)

type Row = { slug: string; u: string | null }
const TARGETS: Array<{ label: string; prefix: string; rows: () => Promise<Row[]> }> = [
  {
    label: 'products',
    prefix: 'products/',
    rows: () => sql`SELECT slug, image_url AS u FROM products` as unknown as Promise<Row[]>,
  },
  {
    label: 'blog',
    prefix: 'blog/',
    rows: () => sql`SELECT slug, cover_image_url AS u FROM articles` as unknown as Promise<Row[]>,
  },
]

const SAMPLE = 10
let problems = 0

for (const t of TARGETS) {
  const cfg = resolveBunnyConfig({ prefix: t.prefix })
  console.log(`\n=== ${t.label} (${t.prefix}) ===`)

  const items = (await listBunny(cfg)).filter(
    (i) => !i.IsDirectory && i.ObjectName.endsWith('.webp')
  )
  const bunnyFiles = new Set(items.map((i) => i.ObjectName))
  const bytes = items.reduce((s, i) => s + i.Length, 0)
  console.log(`  Bunny: ${bunnyFiles.size} files (${(bytes / 1024 / 1024).toFixed(1)} MB)`)

  const rows = await t.rows()
  const dbExpected = new Set<string>()
  let referencing = 0
  let noImage = 0
  const external: string[] = []
  for (const r of rows) {
    if (r.u && cfg.cdnBase && r.u.startsWith(cfg.cdnBase)) {
      // strip cache-bust query/hash (?v=…) so it matches the bare storage key
      dbExpected.add(r.u.replace(`${cfg.cdnBase}/${cfg.prefix}`, '').replace(/[?#].*$/, ''))
      referencing++
    } else if (!r.u || r.u === '') {
      noImage++
    } else {
      external.push(r.slug) // non-Bunny host still referenced — a regression
    }
  }
  console.log(
    `  DB: ${rows.length} rows — ${referencing} on Bunny, ${noImage} no image, ${external.length} external`
  )
  problems += external.length
  for (const s of external.slice(0, 10)) console.log(`    ⚠ external: ${s}`)

  const orphans = [...bunnyFiles].filter((f) => !dbExpected.has(f))
  const broken = [...dbExpected].filter((f) => !bunnyFiles.has(f))
  problems += orphans.length + broken.length
  console.log(`  orphans (Bunny, no DB ref): ${orphans.length}`)
  for (const f of orphans.slice(0, 10)) console.log(`    - ${f}`)
  if (orphans.length > 10) console.log(`    … and ${orphans.length - 10} more`)
  console.log(`  broken refs (DB url, file absent): ${broken.length}`)
  for (const f of broken.slice(0, 10)) console.log(`    - ${f}`)

  const sample = [...bunnyFiles].sort(() => Math.random() - 0.5).slice(0, SAMPLE)
  let ok = 0
  for (const f of sample) {
    const res = await fetch(`${cfg.cdnBase}/${cfg.prefix}${f}`, { method: 'HEAD' })
    if (res.ok) ok++
    else {
      problems++
      console.log(`    ✗ ${f} — HTTP ${res.status}`)
    }
  }
  console.log(`  reachability: ${ok}/${sample.length} OK`)
}

await sql.close()
console.log(`\n${problems === 0 ? '✓ no problems' : `✗ ${problems} problem(s)`}`)
process.exit(problems === 0 ? 0 : 1)
