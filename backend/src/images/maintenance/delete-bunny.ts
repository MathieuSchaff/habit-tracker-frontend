#!/usr/bin/env bun
/**
 * delete-bunny-images.ts — Delete product images from Bunny Storage.
 *
 * Reads slugs from the CDN-delete list (or path passed via $SLUGS_FILE)
 * and DELETEs https://${BUNNY_STORAGE_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${PREFIX}<slug>.webp.
 * 404s are treated as success (idempotent).
 *
 * Required env:
 *   BUNNY_STORAGE_ZONE
 *   BUNNY_STORAGE_PASSWORD
 *
 * Optional env:
 *   BUNNY_STORAGE_HOSTNAME    default: storage.bunnycdn.com
 *   BUNNY_STORAGE_PREFIX      default: products/
 *   SLUGS_FILE                default: ../db/seed/output/dedup-dropped-slugs.json
 *   DRY_RUN                   "1" → preview only
 *   CONCURRENCY               default: 8
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { deleteBunny, resolveBunnyConfig } from '../lib/bunny'

const cfg = resolveBunnyConfig()
const SLUGS_FILE =
  process.env.SLUGS_FILE ??
  join(import.meta.dir, '..', '..', 'db', 'seed', 'output', 'dedup-dropped-slugs.json')
const DRY_RUN = process.env.DRY_RUN === '1'
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 8)

if (!DRY_RUN) {
  const missing = ['BUNNY_STORAGE_ZONE', 'BUNNY_STORAGE_PASSWORD'].filter((k) => !process.env[k])
  if (missing.length > 0) {
    console.error(`missing env: ${missing.join(', ')}\nuse DRY_RUN=1 to preview`)
    process.exit(1)
  }
}

const slugs: string[] = JSON.parse(readFileSync(SLUGS_FILE, 'utf8'))
console.log(`${slugs.length} slugs to delete from ${SLUGS_FILE}`)

if (DRY_RUN) {
  console.log('--- DRY RUN ---')
  for (const s of slugs.slice(0, 5)) {
    console.log(`  DELETE https://${cfg.hostname}/${cfg.zone ?? '<zone>'}/${cfg.prefix}${s}.webp`)
  }
  if (slugs.length > 5) console.log(`  ... and ${slugs.length - 5} more`)
  process.exit(0)
}

let deleted = 0
let notFound = 0
let failed = 0

async function deleteOne(slug: string) {
  try {
    const result = await deleteBunny(cfg, `${slug}.webp`)
    if (result === 'notFound') notFound++
    else deleted++
  } catch (err) {
    failed++
    console.error(`  fail: ${slug} — ${(err as Error).message}`)
  }
}

const queue = [...slugs]
async function worker() {
  while (queue.length > 0) {
    const s = queue.shift()
    if (s) await deleteOne(s)
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

console.log(`\ndeleted: ${deleted}, not-found (already gone): ${notFound}, failed: ${failed}`)
process.exit(failed === 0 ? 0 : 1)
