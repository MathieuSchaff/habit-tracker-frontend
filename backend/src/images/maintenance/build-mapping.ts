#!/usr/bin/env bun

/**
 * build-image-mapping.ts — Generate output/image-mapping.json from the
 * authoritative CDN inventory (Bunny Storage), cross-checked against DB
 * product slugs and the local images-normalized/ staging dir.
 *
 * Replaces the Python one-shot used during the initial Pharmashop import
 * (bidirectional prefix match across 3 local stores). The mapping today
 * answers a single question: "for which slugs does products/<slug>.webp
 * exist on Bunny CDN?" — patch-image-urls.ts then writes the CDN URL.
 *
 * The local images-normalized/ dir is a transient staging area cleaned
 * after upload, so it cannot be the source of truth. Bunny list is.
 *
 * Output:
 *   output/image-mapping.json   { mapping: {slug: {source, file}}, summary, gaps }
 *
 * Required env:
 *   BUNNY_STORAGE_ZONE
 *   BUNNY_STORAGE_PASSWORD
 *   APP_DATABASE_URL (or DATABASE_URL)
 *
 * Optional env:
 *   BUNNY_STORAGE_HOSTNAME    default: storage.bunnycdn.com
 *   BUNNY_STORAGE_PREFIX      default: products/
 *
 * Usage:
 *   bun run backend/src/images/maintenance/build-mapping.ts [--dry]
 */

import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { SQL } from 'bun'

const DRY = process.argv.includes('--dry')
const SEED_ROOT = join(import.meta.dir, '..')
const NORMALIZED_DIR = join(SEED_ROOT, 'output', 'images-normalized')
const MAPPING_PATH = join(SEED_ROOT, 'output', 'image-mapping.json')

const ZONE = process.env.BUNNY_STORAGE_ZONE
const HOSTNAME = process.env.BUNNY_STORAGE_HOSTNAME ?? 'storage.bunnycdn.com'
const PASSWORD = process.env.BUNNY_STORAGE_PASSWORD
const PREFIX = `${(process.env.BUNNY_STORAGE_PREFIX ?? 'products/').replace(/^\/+|\/+$/g, '')}/`
const DB_URL = process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL

const missing = [
  !ZONE && 'BUNNY_STORAGE_ZONE',
  !PASSWORD && 'BUNNY_STORAGE_PASSWORD',
  !DB_URL && 'APP_DATABASE_URL',
].filter(Boolean) as string[]
if (missing.length > 0) {
  console.error(`missing env: ${missing.join(', ')}`)
  process.exit(1)
}

console.log(`→ listing Bunny storage at ${PREFIX}…`)
const listRes = await fetch(`https://${HOSTNAME}/${ZONE}/${PREFIX}`, {
  headers: { AccessKey: PASSWORD as string },
})
if (!listRes.ok) {
  console.error(`bunny list failed: HTTP ${listRes.status}`)
  process.exit(1)
}
const items = (await listRes.json()) as Array<{ ObjectName: string; IsDirectory: boolean }>
const cdnWebpFiles = items
  .filter((i) => !i.IsDirectory && i.ObjectName.endsWith('.webp'))
  .map((i) => i.ObjectName)
const cdnSlugs = new Set(cdnWebpFiles.map((f) => f.replace(/\.webp$/, '')))
console.log(`  ${cdnWebpFiles.length} webp on Bunny`)

const localSlugs = existsSync(NORMALIZED_DIR)
  ? new Set(
      readdirSync(NORMALIZED_DIR)
        .filter((f) => f.endsWith('.webp'))
        .map((f) => f.replace(/\.webp$/, ''))
    )
  : new Set<string>()
console.log(`  ${localSlugs.size} webp local (staging)\n`)

const sql = new SQL(DB_URL as string)
const rows = (await sql`SELECT slug, image_url FROM products`) as Array<{
  slug: string
  image_url: string | null
}>
await sql.close()
const dbSlugs = new Set(rows.map((r) => r.slug))
console.log(`→ DB: ${rows.length} products\n`)

type Entry = { source: 'cdn'; file: string; localStaged: boolean }
const mapping: Record<string, Entry> = {}
for (const slug of cdnSlugs) {
  if (dbSlugs.has(slug)) {
    mapping[slug] = { source: 'cdn', file: `${slug}.webp`, localStaged: localSlugs.has(slug) }
  }
}

const cdnOrphans = [...cdnSlugs].filter((s) => !dbSlugs.has(s)).sort()
const localOrphans = [...localSlugs].filter((s) => !dbSlugs.has(s)).sort()
const localNotOnCdn = [...localSlugs].filter((s) => !cdnSlugs.has(s)).sort()
const productsNoImage = rows.filter((r) => !cdnSlugs.has(r.slug))
const productsNoImageNoUrl = productsNoImage.filter((r) => !r.image_url)
const productsNoImageExternal = productsNoImage.filter((r) => r.image_url)

const summary = {
  mapped: Object.keys(mapping).length,
  cdnFiles: cdnWebpFiles.length,
  localStaged: localSlugs.size,
  dbProducts: rows.length,
  cdnOrphans: cdnOrphans.length,
  localOrphans: localOrphans.length,
  localPendingUpload: localNotOnCdn.length,
  productsNoCdn: productsNoImage.length,
  productsNoCdnNoUrl: productsNoImageNoUrl.length,
  productsNoCdnExternal: productsNoImageExternal.length,
}

console.log('→ summary')
console.log(`  mapped (CDN ∩ DB):              ${summary.mapped}`)
console.log(`  CDN orphans (no DB slug):       ${summary.cdnOrphans}`)
console.log(`  local orphans (no DB slug):     ${summary.localOrphans}`)
console.log(`  local pending upload (not CDN): ${summary.localPendingUpload}`)
console.log(`  products without CDN:           ${summary.productsNoCdn}`)
console.log(`    — no image_url:               ${summary.productsNoCdnNoUrl}`)
console.log(`    — external image_url:         ${summary.productsNoCdnExternal}`)

if (cdnOrphans.length > 0) {
  console.log(`\n→ CDN orphan samples (first 10):`)
  for (const s of cdnOrphans.slice(0, 10)) console.log(`  - ${s}.webp`)
}
if (localNotOnCdn.length > 0) {
  console.log(`\n→ local pending upload samples (first 10):`)
  for (const s of localNotOnCdn.slice(0, 10)) console.log(`  - ${s}.webp`)
}

const gaps = {
  cdnOrphans,
  localOrphans,
  localPendingUpload: localNotOnCdn,
  productsNoCdnNoUrl: productsNoImageNoUrl.map((r) => r.slug),
  productsNoCdnExternal: productsNoImageExternal.map((r) => ({ slug: r.slug, url: r.image_url })),
}

const payload = { mapping, summary, gaps }
if (DRY) {
  console.log(`\n(dry run — would write ${MAPPING_PATH})`)
} else {
  writeFileSync(MAPPING_PATH, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(`\nwrote ${MAPPING_PATH}`)
}
