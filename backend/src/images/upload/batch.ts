#!/usr/bin/env bun
/**
 * upload-images.ts — Upload normalized product images to Bunny Storage.
 *
 * Reads output/images-normalized/<slug>.webp and PUTs each to
 * https://${BUNNY_STORAGE_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${PREFIX}<slug>.webp
 * via Bunny's native HTTP API (AccessKey header auth, no sigv4).
 *
 * Required env:
 *   BUNNY_STORAGE_ZONE        storage zone name (e.g. aurore-images)
 *   BUNNY_STORAGE_HOSTNAME    region hostname (e.g. storage.bunnycdn.com)
 *   BUNNY_STORAGE_PASSWORD    storage zone password (FTP & API Access panel)
 *
 * Optional env:
 *   BUNNY_STORAGE_PREFIX      key prefix (default: products/)
 *   DRY_RUN                   "1" → list jobs, no upload
 *   CONCURRENCY               parallel uploads (default: 16)
 *
 * Usage:
 *   bun run backend/src/images/upload/batch.ts
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SEED_ROOT = join(import.meta.dir, '..')
const SOURCE_DIR = join(SEED_ROOT, 'output', 'images-normalized')

const ZONE = process.env.BUNNY_STORAGE_ZONE
const HOSTNAME = process.env.BUNNY_STORAGE_HOSTNAME ?? 'storage.bunnycdn.com'
const PASSWORD = process.env.BUNNY_STORAGE_PASSWORD
const PREFIX = `${(process.env.BUNNY_STORAGE_PREFIX ?? 'products/').replace(/^\/+|\/+$/g, '')}/`
const DRY_RUN = process.env.DRY_RUN === '1'
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 16)

if (!DRY_RUN) {
  const missing = ['BUNNY_STORAGE_ZONE', 'BUNNY_STORAGE_PASSWORD'].filter((k) => !process.env[k])
  if (missing.length > 0) {
    console.error(`missing env: ${missing.join(', ')}\nuse DRY_RUN=1 to preview`)
    process.exit(1)
  }
}

const files = readdirSync(SOURCE_DIR).filter((f) => f.endsWith('.webp'))
console.log(`found ${files.length} webp files in ${SOURCE_DIR}`)
if (DRY_RUN) {
  console.log('--- DRY RUN ---')
  for (const f of files.slice(0, 5)) {
    const size = statSync(join(SOURCE_DIR, f)).size
    console.log(`  https://${HOSTNAME}/${ZONE ?? '<zone>'}/${PREFIX}${f}  (${size} B)`)
  }
  if (files.length > 5) console.log(`  ... and ${files.length - 5} more`)
  process.exit(0)
}

let done = 0
let failed = 0
const start = Date.now()

async function uploadOne(file: string) {
  const key = `${PREFIX}${file}`
  const body = readFileSync(join(SOURCE_DIR, file))
  const url = `https://${HOSTNAME}/${ZONE}/${key}`
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        AccessKey: PASSWORD as string,
        'Content-Type': 'image/webp',
      },
      body,
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} — ${await res.text()}`)
    }
    done++
    if (done % 100 === 0) {
      const rate = (done / ((Date.now() - start) / 1000)).toFixed(1)
      console.log(`  ${done}/${files.length} (${rate}/s)`)
    }
  } catch (err) {
    failed++
    console.error(`  fail: ${file} — ${(err as Error).message}`)
  }
}

const queue = [...files]
async function worker() {
  while (queue.length > 0) {
    const f = queue.shift()
    if (f) await uploadOne(f)
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

console.log(
  `\ndone: ${done} uploaded, ${failed} failed in ${((Date.now() - start) / 1000).toFixed(1)}s`
)
process.exit(failed === 0 ? 0 : 1)
