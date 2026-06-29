#!/usr/bin/env bun
/**
 * migrate-blog-covers.ts — Publish blog article covers to Bunny CDN.
 *
 * Articles whose cover_image_url still points at images.unsplash.com are blocked
 * by the prod CSP (only *.b-cdn.net is allowed). Fetch each as webp (Unsplash
 * `fm=webp`), upload to Bunny `blog/<slug>.webp`. Upload-only: the DB rewrite is
 * a separate db-fix so dev and prod move symmetrically. Re-runnable (overwrites).
 *
 * Required env: BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD, IMAGE_CDN_BASE,
 *               APP_DATABASE_URL (or DATABASE_URL).
 *
 * Usage:
 *   bun run src/images/maintenance/migrate-blog-covers.ts --dry
 *   bun run src/images/maintenance/migrate-blog-covers.ts [--concurrency N]
 */

import { SQL } from 'bun'

import { putBunny, resolveBunnyConfig } from '../lib/bunny'

const DRY = process.argv.includes('--dry')
const concurrencyIdx = process.argv.indexOf('--concurrency')
const CONCURRENCY = concurrencyIdx >= 0 ? Math.max(1, Number(process.argv[concurrencyIdx + 1])) : 4

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36'

const cfg = resolveBunnyConfig({ prefix: 'blog/' })
if (!cfg.cdnBase) throw new Error('missing IMAGE_CDN_BASE')
if (!DRY && (!cfg.zone || !cfg.password)) {
  throw new Error('missing BUNNY_STORAGE_ZONE / BUNNY_STORAGE_PASSWORD')
}

function webpUrl(url: string): string {
  const [base, qs = ''] = url.split('?')
  const params = new URLSearchParams(qs)
  if (!params.has('fm')) params.set('fm', 'webp')
  if (!params.has('w')) params.set('w', '1400')
  if (!params.has('q')) params.set('q', '80')
  return `${base}?${params.toString()}`
}

const sql = new SQL(process.env.APP_DATABASE_URL ?? (process.env.DATABASE_URL as string))
const rows = (await sql`
  SELECT slug, cover_image_url AS url
  FROM articles
  WHERE cover_image_url LIKE 'https://images.unsplash.com/%'
  ORDER BY slug
`) as { slug: string; url: string }[]
await sql.close()

console.log(`→ ${rows.length} covers, concurrency=${CONCURRENCY}, ${DRY ? 'DRY' : 'APPLY'}`)

let ok = 0
let failed = 0
const queue = [...rows]
async function worker() {
  while (queue.length > 0) {
    const job = queue.shift()
    if (!job) break
    const cdnUrl = `${cfg.cdnBase}/${cfg.prefix}${job.slug}.webp`
    if (DRY) {
      console.log(`  dry ${job.slug} ← ${job.url.slice(0, 60)}… → ${cdnUrl}`)
      ok++
      continue
    }
    try {
      const res = await fetch(webpUrl(job.url), { headers: { 'User-Agent': UA } })
      if (!res.ok) throw new Error(`GET HTTP ${res.status}`)
      const bytes = new Uint8Array(await res.arrayBuffer())
      await putBunny(cfg, `${job.slug}.webp`, bytes)
      ok++
      console.log(`  ok ${job.slug} (${bytes.length}B) → ${cdnUrl}`)
    } catch (err) {
      failed++
      console.error(`  fail ${job.slug}: ${(err as Error).message}`)
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

console.log(`\ndone: ok=${ok}/${rows.length}, failed=${failed}`)
process.exit(failed === 0 ? 0 : 1)
