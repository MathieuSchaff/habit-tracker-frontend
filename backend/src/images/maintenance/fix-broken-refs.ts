#!/usr/bin/env bun
/**
 * fix-broken-image-refs.ts — Reconcile image_url drift between Bunny CDN
 * inventory and DB products, driven by output/image-mapping.json gaps.
 *
 * Three operations, all idempotent, dry-run by default:
 *
 *   1. RENAME — product.image_url points at <old>.webp that exists on Bunny
 *      but the DB slug has been canonicalised. Copy <old>.webp → <slug>.webp,
 *      UPDATE products.image_url to the new URL, DELETE <old>.webp.
 *
 *   2. NULLIFY — product.image_url points at <old>.webp that is NOT on Bunny
 *      (image lost). Set image_url = NULL so the gap is explicit.
 *
 *   3. ORPHAN_CLEANUP — webp on Bunny with no matching DB slug AND not used
 *      as a rename source. DELETE the file.
 *
 * Required env:
 *   BUNNY_STORAGE_ZONE
 *   BUNNY_STORAGE_PASSWORD
 *   APP_DATABASE_URL (or DATABASE_URL)
 *
 * Optional env:
 *   BUNNY_STORAGE_HOSTNAME    default: storage.bunnycdn.com
 *   BUNNY_STORAGE_PREFIX      default: products/
 *   IMAGE_CDN_BASE            required for rename URL rewrite (e.g. https://aurore-cdn.b-cdn.net)
 *
 * Usage:
 *   bun run backend/src/images/maintenance/fix-broken-refs.ts          # dry-run
 *   bun run backend/src/images/maintenance/fix-broken-refs.ts --apply  # execute
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SQL } from 'bun'

const APPLY = process.argv.includes('--apply')
const SEED_ROOT = join(import.meta.dir, '..')
const MAPPING_PATH = join(SEED_ROOT, 'output', 'image-mapping.json')

const ZONE = process.env.BUNNY_STORAGE_ZONE
const HOSTNAME = process.env.BUNNY_STORAGE_HOSTNAME ?? 'storage.bunnycdn.com'
const PASSWORD = process.env.BUNNY_STORAGE_PASSWORD
const PREFIX = `${(process.env.BUNNY_STORAGE_PREFIX ?? 'products/').replace(/^\/+|\/+$/g, '')}/`
const CDN_BASE = (process.env.IMAGE_CDN_BASE ?? '').replace(/\/+$/, '')
const DB_URL = process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL

const missing = [
  !ZONE && 'BUNNY_STORAGE_ZONE',
  !PASSWORD && 'BUNNY_STORAGE_PASSWORD',
  !DB_URL && 'APP_DATABASE_URL',
  !CDN_BASE && 'IMAGE_CDN_BASE',
].filter(Boolean) as string[]
if (missing.length > 0) {
  console.error(`missing env: ${missing.join(', ')}`)
  process.exit(1)
}

type Mapping = {
  gaps: {
    cdnOrphans: string[]
    productsNoCdnExternal: Array<{ slug: string; url: string }>
  }
}
const data = JSON.parse(readFileSync(MAPPING_PATH, 'utf8')) as Mapping
const orphans = new Set(data.gaps.cdnOrphans)

const renames: Array<{ slug: string; oldFile: string; newFile: string }> = []
const nullifies: Array<{ slug: string; oldUrl: string }> = []
for (const item of data.gaps.productsNoCdnExternal) {
  if (!item.url.includes('aurore-cdn')) continue
  const m = item.url.match(/\/products\/([^/]+)\.webp$/)
  if (!m) continue
  const oldName = m[1]
  if (orphans.has(oldName)) {
    renames.push({ slug: item.slug, oldFile: `${oldName}.webp`, newFile: `${item.slug}.webp` })
  } else {
    nullifies.push({ slug: item.slug, oldUrl: item.url })
  }
}
const renameSources = new Set(renames.map((r) => r.oldFile.replace(/\.webp$/, '')))
const cleanupOrphans = [...orphans].filter((s) => !renameSources.has(s)).sort()

console.log('→ plan')
console.log(`  rename:          ${renames.length}`)
console.log(`  nullify:         ${nullifies.length}`)
console.log(`  orphan cleanup:  ${cleanupOrphans.length}`)
console.log(APPLY ? '\n→ APPLY mode\n' : '\n→ DRY RUN (use --apply to execute)\n')

if (!APPLY) {
  console.log('renames:')
  for (const r of renames) console.log(`  ${r.oldFile} → ${r.newFile}  (slug ${r.slug})`)
  console.log('\nnullifies (no orphan to copy from):')
  for (const n of nullifies) console.log(`  ${n.slug}  (was ${n.oldUrl})`)
  console.log('\norphan cleanup samples (first 10):')
  for (const s of cleanupOrphans.slice(0, 10)) console.log(`  DELETE ${s}.webp`)
  if (cleanupOrphans.length > 10) console.log(`  ... and ${cleanupOrphans.length - 10} more`)
  process.exit(0)
}

const sql = new SQL(DB_URL as string)

async function bunnyGet(file: string): Promise<Uint8Array> {
  const url = `https://${HOSTNAME}/${ZONE}/${PREFIX}${file}`
  const res = await fetch(url, { headers: { AccessKey: PASSWORD as string } })
  if (!res.ok) throw new Error(`GET ${file}: HTTP ${res.status}`)
  return new Uint8Array(await res.arrayBuffer())
}
async function bunnyPut(file: string, body: Uint8Array): Promise<void> {
  const url = `https://${HOSTNAME}/${ZONE}/${PREFIX}${file}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { AccessKey: PASSWORD as string, 'Content-Type': 'image/webp' },
    body,
  })
  if (!res.ok) throw new Error(`PUT ${file}: HTTP ${res.status} ${await res.text()}`)
}
async function bunnyDelete(file: string): Promise<'deleted' | 'notFound'> {
  const url = `https://${HOSTNAME}/${ZONE}/${PREFIX}${file}`
  const res = await fetch(url, { method: 'DELETE', headers: { AccessKey: PASSWORD as string } })
  if (res.status === 404) return 'notFound'
  if (!res.ok) throw new Error(`DELETE ${file}: HTTP ${res.status}`)
  return 'deleted'
}

let renameDone = 0
let renameFailed = 0
for (const r of renames) {
  try {
    const body = await bunnyGet(r.oldFile)
    await bunnyPut(r.newFile, body)
    const newUrl = `${CDN_BASE}/${PREFIX}${r.newFile}`
    await sql`UPDATE products SET image_url = ${newUrl} WHERE slug = ${r.slug}`
    await bunnyDelete(r.oldFile)
    renameDone++
    console.log(`  ok rename ${r.oldFile} → ${r.newFile}`)
  } catch (err) {
    renameFailed++
    console.error(`  fail rename ${r.oldFile}: ${(err as Error).message}`)
  }
}

let nullifyDone = 0
for (const n of nullifies) {
  await sql`UPDATE products SET image_url = NULL WHERE slug = ${n.slug}`
  nullifyDone++
  console.log(`  ok nullify ${n.slug}`)
}

let cleanupDone = 0
let cleanupNotFound = 0
let cleanupFailed = 0
for (const s of cleanupOrphans) {
  try {
    const result = await bunnyDelete(`${s}.webp`)
    if (result === 'notFound') cleanupNotFound++
    else cleanupDone++
  } catch (err) {
    cleanupFailed++
    console.error(`  fail cleanup ${s}: ${(err as Error).message}`)
  }
}

await sql.close()

console.log(
  `\ndone: rename=${renameDone}/${renames.length} (failed=${renameFailed}), nullify=${nullifyDone}/${nullifies.length}, cleanup=${cleanupDone}+${cleanupNotFound}gone/${cleanupOrphans.length} (failed=${cleanupFailed})`
)
process.exit(renameFailed + cleanupFailed === 0 ? 0 : 1)
