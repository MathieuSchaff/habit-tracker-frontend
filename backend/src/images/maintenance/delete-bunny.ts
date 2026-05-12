#!/usr/bin/env bun
/**
 * delete-bunny-images.ts — Delete product images from Bunny Storage.
 *
 * Reads slugs from output/dedupe-dropped.json (or path passed via $SLUGS_FILE)
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
 *   SLUGS_FILE                default: output/dedupe-dropped.json
 *   DRY_RUN                   "1" → preview only
 *   CONCURRENCY               default: 8
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SEED_ROOT = join(import.meta.dir, '..')
const ZONE = process.env.BUNNY_STORAGE_ZONE
const HOSTNAME = process.env.BUNNY_STORAGE_HOSTNAME ?? 'storage.bunnycdn.com'
const PASSWORD = process.env.BUNNY_STORAGE_PASSWORD
const PREFIX = `${(process.env.BUNNY_STORAGE_PREFIX ?? 'products/').replace(/^\/+|\/+$/g, '')}/`
const SLUGS_FILE = process.env.SLUGS_FILE ?? join(SEED_ROOT, 'output', 'dedupe-dropped.json')
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
    console.log(`  DELETE https://${HOSTNAME}/${ZONE ?? '<zone>'}/${PREFIX}${s}.webp`)
  }
  if (slugs.length > 5) console.log(`  ... and ${slugs.length - 5} more`)
  process.exit(0)
}

let deleted = 0
let notFound = 0
let failed = 0

async function deleteOne(slug: string) {
  const url = `https://${HOSTNAME}/${ZONE}/${PREFIX}${slug}.webp`
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { AccessKey: PASSWORD as string },
    })
    if (res.status === 404) {
      notFound++
      return
    }
    if (!res.ok) {
      failed++
      console.error(`  fail: ${slug} — HTTP ${res.status} ${res.statusText}`)
      return
    }
    deleted++
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
