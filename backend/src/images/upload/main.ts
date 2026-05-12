#!/usr/bin/env bun
/**
 * upload-product-image.ts — CLI wrapper around lib/upload-product-image.
 *
 * Single:
 *   bun run scripts/upload-product-image.ts <slug> --url <URL>
 *   bun run scripts/upload-product-image.ts <slug> --file <PATH>
 *
 * Batch (JSON array of { slug, url? | file? }):
 *   bun run scripts/upload-product-image.ts --batch <jobs.json>
 *
 * Flags:
 *   --dry            preview, no Bunny PUT or DB UPDATE
 *   --no-db          skip DB UPDATE
 *   --no-staged      skip writing to output/images-{source,normalized}/
 *   --concurrency N  batch only (default 4)
 *
 * Required env (apply mode): see lib/upload-product-image.ts.
 *
 * After a batch, run `just db-snapshot` to persist DB changes to snapshot/data.sql.
 */

import { readFileSync } from 'node:fs'
import { SQL } from 'bun'

import { uploadProductImage } from './lib'

type Job = { slug: string; url?: string; file?: string }

function parseArgs(argv: string[]) {
  const flags = new Set(argv.filter((a) => a.startsWith('--')))
  const dry = flags.has('--dry')
  const noDb = flags.has('--no-db')
  const noStaged = flags.has('--no-staged')
  const concurrencyIdx = argv.indexOf('--concurrency')
  const concurrency = concurrencyIdx >= 0 ? Number(argv[concurrencyIdx + 1]) : 4
  const batchIdx = argv.indexOf('--batch')
  const urlIdx = argv.indexOf('--url')
  const fileIdx = argv.indexOf('--file')
  const positional = argv.filter(
    (a, i) => !a.startsWith('--') && argv[i - 1]?.startsWith('--') !== true
  )
  return {
    dry,
    noDb,
    noStaged,
    concurrency,
    batch: batchIdx >= 0 ? argv[batchIdx + 1] : null,
    url: urlIdx >= 0 ? argv[urlIdx + 1] : null,
    file: fileIdx >= 0 ? argv[fileIdx + 1] : null,
    slug: positional[0] ?? null,
  }
}

const args = parseArgs(process.argv.slice(2))

function jobToInput(job: Job) {
  if (job.url) return { slug: job.slug, source: { type: 'url' as const, url: job.url } }
  if (job.file) return { slug: job.slug, source: { type: 'file' as const, path: job.file } }
  throw new Error(`job ${job.slug}: missing url or file`)
}

async function runJobs(jobs: Job[], concurrency: number) {
  if (jobs.length === 0) {
    console.error('no jobs')
    process.exit(1)
  }
  console.log(`→ ${jobs.length} jobs, concurrency=${concurrency}, ${args.dry ? 'DRY' : 'APPLY'}`)

  const sql =
    args.dry || args.noDb
      ? null
      : new SQL(process.env.APP_DATABASE_URL ?? (process.env.DATABASE_URL as string))
  const baseOpts = {
    dry: args.dry,
    ...(sql ? { sql } : {}),
  }

  let ok = 0
  let failed = 0
  const queue = [...jobs]
  async function worker() {
    while (queue.length > 0) {
      const job = queue.shift()
      if (!job) break
      try {
        const input = {
          ...jobToInput(job),
          saveStaged: !args.noStaged,
          updateDb: !args.noDb,
        }
        const r = await uploadProductImage(input, baseOpts)
        ok++
        console.log(
          `  ok ${r.slug} (${r.sourceExt} → webp ${r.bytes}B, bunny=${r.bunnyUploaded}, db=${r.dbUpdated})`
        )
      } catch (err) {
        failed++
        console.error(`  fail ${job.slug}: ${(err as Error).message}`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()))

  if (sql) await sql.close()
  console.log(
    `\ndone: ok=${ok}/${jobs.length}, failed=${failed}` +
      (!args.dry && !args.noDb && ok > 0 ? `\nnext: \`just db-snapshot\` to commit DB changes` : '')
  )
  process.exit(failed === 0 ? 0 : 1)
}

if (args.batch) {
  const jobs = JSON.parse(readFileSync(args.batch, 'utf8')) as Job[]
  await runJobs(jobs, args.concurrency)
} else if (args.slug && (args.url || args.file)) {
  await runJobs([{ slug: args.slug, url: args.url ?? undefined, file: args.file ?? undefined }], 1)
} else {
  console.error(
    'usage:\n  bun run scripts/upload-product-image.ts <slug> --url <URL>\n  bun run scripts/upload-product-image.ts <slug> --file <PATH>\n  bun run scripts/upload-product-image.ts --batch <jobs.json>\n\nflags: --dry --no-db --no-staged --concurrency N'
  )
  process.exit(1)
}
