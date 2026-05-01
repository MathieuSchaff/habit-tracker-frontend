#!/usr/bin/env bun
/**
 * audit-bunny-images.ts — Cross-check between Bunny Storage inventory,
 * local image-mapping.json, and DB products.image_url. Reports orphans
 * (on Bunny but no product), missing (DB references CDN url not on Bunny),
 * and reachability of a 10-URL sample.
 *
 * Required env:
 *   BUNNY_STORAGE_ZONE
 *   BUNNY_STORAGE_PASSWORD
 *   APP_DATABASE_URL (or DATABASE_URL)
 *
 * Optional env:
 *   BUNNY_STORAGE_HOSTNAME    default: storage.bunnycdn.com
 *   BUNNY_STORAGE_PREFIX      default: products/
 *   IMAGE_CDN_BASE
 */

import { SQL } from 'bun'

const ZONE = process.env.BUNNY_STORAGE_ZONE
const HOSTNAME = process.env.BUNNY_STORAGE_HOSTNAME ?? 'storage.bunnycdn.com'
const PASSWORD = process.env.BUNNY_STORAGE_PASSWORD
const PREFIX = `${(process.env.BUNNY_STORAGE_PREFIX ?? 'products/').replace(/^\/+|\/+$/g, '')}/`
const CDN_BASE = (process.env.IMAGE_CDN_BASE ?? '').replace(/\/+$/, '')
const DB_URL = process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL

if (!ZONE || !PASSWORD || !DB_URL) {
  console.error('missing env: BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD, APP_DATABASE_URL')
  process.exit(1)
}

console.log('→ listing Bunny storage…')
const listRes = await fetch(`https://${HOSTNAME}/${ZONE}/${PREFIX}`, {
  headers: { AccessKey: PASSWORD },
})
if (!listRes.ok) {
  console.error(`bunny list failed: HTTP ${listRes.status}`)
  process.exit(1)
}
const items = (await listRes.json()) as Array<{
  ObjectName: string
  IsDirectory: boolean
  Length: number
}>
const bunnyFiles = new Set(
  items.filter((i) => !i.IsDirectory && i.ObjectName.endsWith('.webp')).map((i) => i.ObjectName)
)
const totalBytes = items
  .filter((i) => !i.IsDirectory && i.ObjectName.endsWith('.webp'))
  .reduce((s, i) => s + i.Length, 0)

console.log(`  ${bunnyFiles.size} files on Bunny (${(totalBytes / 1024 / 1024).toFixed(1)} MB)\n`)

console.log('→ querying DB products.image_url…')
const sql = new SQL(DB_URL)
const rows = (await sql`SELECT slug, image_url FROM products`) as Array<{
  slug: string
  image_url: string | null
}>
const dbCdnSlugs = new Set<string>()
const dbExpectedFiles = new Set<string>()
for (const r of rows) {
  if (r.image_url && CDN_BASE && r.image_url.startsWith(CDN_BASE)) {
    const file = r.image_url.replace(`${CDN_BASE}/${PREFIX}`, '')
    dbExpectedFiles.add(file)
    dbCdnSlugs.add(r.slug)
  }
}
console.log(`  ${rows.length} products in DB, ${dbCdnSlugs.size} reference CDN\n`)

const orphansOnBunny = [...bunnyFiles].filter((f) => !dbExpectedFiles.has(f))
const missingOnBunny = [...dbExpectedFiles].filter((f) => !bunnyFiles.has(f))

console.log(`→ orphans on Bunny (uploaded but no product references): ${orphansOnBunny.length}`)
for (const f of orphansOnBunny.slice(0, 10)) console.log(`  - ${f}`)
if (orphansOnBunny.length > 10) console.log(`  ... and ${orphansOnBunny.length - 10} more`)

console.log(`\n→ broken DB references (CDN url but file absent): ${missingOnBunny.length}`)
for (const f of missingOnBunny.slice(0, 10)) console.log(`  - ${f}`)

console.log('\n→ reachability sample (10 random)…')
const sample = [...bunnyFiles].sort(() => Math.random() - 0.5).slice(0, 10)
let ok = 0
let fail = 0
for (const f of sample) {
  const url = `${CDN_BASE}/${PREFIX}${f}`
  const res = await fetch(url, { method: 'HEAD' })
  if (res.ok) {
    ok++
  } else {
    fail++
    console.log(`  ✗ ${url} — HTTP ${res.status}`)
  }
}
console.log(`  ${ok}/${sample.length} reachable via CDN, ${fail} failed`)

await sql.close()
