// Bulk product creation from a scraped JSONL lot — the CATALOGUE-lane ingest
// described in docs/CATALOGUE_SEEDING.md. Every row goes through createProduct so
// validation, cleanInci and auto-tagging follow the exact same path as the app.
//
// Input: one JSON object per line, fields = CreateProductInput.
// Optional classifications file: { [slug]: "DROP" | { kind?, category?, ... } }
// (LLM verdicts, kept versioned — overrides are merged over the JSONL row).
//
// Usage (run in-container, cwd /app/backend — see `just ingest-catalogue`):
//   bun run src/db/seed/ingest/catalogue/main.ts lot.jsonl                            # dry-run
//   bun run src/db/seed/ingest/catalogue/main.ts lot.jsonl --classifications c.json   # with verdicts
//   bun run src/db/seed/ingest/catalogue/main.ts lot.jsonl --write                    # apply
//
// Gate: any invalid row, in-lot dup or DB name+brand dup is a blocker — the run
// exits 1 (dry-run AND write) without writing anything, unless --allow-partial.
// Every run writes tmp/data-runs/<lot>-<ts>/plan.json (counters + blockers +
// lot sha256); a write also appends apply.jsonl (one line per attempted row).
//
// Env: SEED_OWNER_EMAIL — catalogue owner (default seed@seed.com). The owner must
// already exist AND be admin (dev: `just db-seed`, prod: `just db-prod-admin`);
// this script never creates or promotes accounts.

import { createHash } from 'node:crypto'
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

import { type CreateProductInput, createProductSchema } from '@aurore/shared'

import slugify from '@sindresorhus/slugify'

import { getUser } from '../../../../features/auth/user.utils'
import { ProductError } from '../../../../features/products/product-error'
import { createProduct } from '../../../../features/products/service'
import { db } from '../../..'
import { withAdminRls } from '../../../rls'
import { products } from '../../../schema'

const WRITE = process.argv.includes('--write')
const ALLOW_PARTIAL = process.argv.includes('--allow-partial')

type Verdict = 'DROP' | Partial<CreateProductInput>

// Mirror of the SQL norm() the products_name_brand_unique_visible index uses
// (migration 0081): lower(trim(regexp_replace($1, '\s+', ' ', 'g'))).
const normKey = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase()
// Escaped NUL separator (never a literal byte: it turns the file binary for git).
// NUL cannot survive norm(), so "a b"+"c" never collides with "a"+"b c".
const nameBrandKey = (name: string, brand: string) => `${normKey(name)}\u0000${normKey(brand)}`

function parseArgs(): { jsonlPath: string; classificationsPath: string | null } {
  const args = process.argv.slice(2).filter((a) => a !== '--write' && a !== '--allow-partial')
  const cIdx = args.indexOf('--classifications')
  let classificationsPath: string | null = null
  if (cIdx !== -1) {
    classificationsPath = args[cIdx + 1] ?? null
    args.splice(cIdx, 2)
  }
  const jsonlPath = args[0]
  if (!jsonlPath) {
    console.error('Usage: main.ts <lot.jsonl> [--classifications <verdicts.json>] [--write]')
    process.exit(1)
  }
  return { jsonlPath: resolve(jsonlPath), classificationsPath }
}

function readJsonl(path: string): Record<string, unknown>[] {
  return readFileSync(path, 'utf-8')
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l, i) => {
      try {
        return JSON.parse(l) as Record<string, unknown>
      } catch {
        throw new Error(`${path}:${i + 1} — invalid JSON line`)
      }
    })
}

async function main() {
  const { jsonlPath, classificationsPath } = parseArgs()
  console.log('📦 Ingest catalogue (bulk createProduct)')
  console.log(`   mode=${WRITE ? 'WRITE' : 'DRY-RUN'} · lot=${jsonlPath}\n`)

  const rows = readJsonl(jsonlPath)
  const verdicts: Record<string, Verdict> = classificationsPath
    ? (JSON.parse(readFileSync(resolve(classificationsPath), 'utf-8')) as Record<string, Verdict>)
    : {}

  // Read as admin so hidden rows count too. The name+brand unique index is
  // partial (visible only) and createProduct's pre-check is visible-only, so a
  // dup against a hidden product would INSERT cleanly — this dry-run set is the
  // only place it can be refused. Slug idempotence (seed-core mechanic) needs
  // hidden slugs too: the slug index is full, a hidden slug still collides.
  const existingRows = await withAdminRls((tx) =>
    tx.select({ slug: products.slug, name: products.name, brand: products.brand }).from(products)
  )
  const existingSlugs = new Set(existingRows.map((r) => r.slug))
  const existingNameBrands = new Set(existingRows.map((r) => nameBrandKey(r.name, r.brand)))

  let dropped = 0
  let skippedExisting = 0
  let invalid = 0
  let dupInLot = 0
  let dupInDb = 0
  const blockers: { line: number; slug: string | null; reason: string }[] = []
  const candidates: { slug: string; input: CreateProductInput }[] = []
  const seenSlugs = new Set<string>()
  const seenNameBrand = new Set<string>()

  for (const [i, row] of rows.entries()) {
    const rawSlug = typeof row.slug === 'string' && row.slug ? row.slug : null
    // Verdicts are keyed by slug; a row without an explicit slug is looked up
    // by the same fallback slug the ingest would assign it.
    const fallbackSlug =
      typeof row.name === 'string' && typeof row.brand === 'string'
        ? slugify(`${row.name}-${row.brand}`)
        : null
    const verdictKey = rawSlug ?? fallbackSlug
    const verdict = verdictKey ? verdicts[verdictKey] : undefined
    if (verdict === 'DROP') {
      dropped++
      continue
    }
    const merged = verdict ? { ...row, ...verdict } : row
    const parsed = createProductSchema.safeParse(merged)
    if (!parsed.success) {
      invalid++
      const reason = `invalid: ${parsed.error.issues[0]?.message}`
      blockers.push({ line: i + 1, slug: rawSlug, reason })
      console.warn(`   ✗ line ${i + 1} (${rawSlug ?? '?'}): ${parsed.error.issues[0]?.message}`)
      continue
    }
    // A non-slugify-stable slug gets rewritten by createProduct: stored slug ≠
    // input slug → auto-tag keyed by slug misses and re-runs stop being idempotent.
    // The schema regex already rejects most shapes; this is the exact authority.
    if (parsed.data.slug && slugify(parsed.data.slug) !== parsed.data.slug) {
      invalid++
      blockers.push({ line: i + 1, slug: parsed.data.slug, reason: 'slug not slugify-stable' })
      console.warn(`   ✗ line ${i + 1}: slug not slugify-stable: ${parsed.data.slug}`)
      continue
    }
    const effectiveSlug = parsed.data.slug ?? slugify(`${parsed.data.name}-${parsed.data.brand}`)
    if (existingSlugs.has(effectiveSlug)) {
      skippedExisting++
      continue
    }
    const nameBrand = nameBrandKey(parsed.data.name, parsed.data.brand)
    if (existingNameBrands.has(nameBrand)) {
      dupInDb++
      blockers.push({
        line: i + 1,
        slug: effectiveSlug,
        reason: 'name+brand already in DB under another slug',
      })
      console.warn(
        `   ✗ line ${i + 1} (${effectiveSlug}): name+brand already in DB under another slug`
      )
      continue
    }
    if (seenSlugs.has(effectiveSlug) || seenNameBrand.has(nameBrand)) {
      dupInLot++
      blockers.push({ line: i + 1, slug: effectiveSlug, reason: 'duplicate within lot' })
      console.warn(`   ✗ line ${i + 1} (${effectiveSlug}): duplicate within lot`)
      continue
    }
    seenSlugs.add(effectiveSlug)
    seenNameBrand.add(nameBrand)
    candidates.push({ slug: effectiveSlug, input: parsed.data })
  }

  console.log(`\n📊 Lot : ${rows.length} lignes`)
  console.log(`   à créer            : ${candidates.length}`)
  console.log(`   déjà en DB (skip)  : ${skippedExisting}`)
  console.log(`   dup name+brand DB  : ${dupInDb}`)
  console.log(`   dup intra-lot      : ${dupInLot}`)
  console.log(`   DROP (verdicts)    : ${dropped}`)
  console.log(`   invalides          : ${invalid}\n`)

  // Machine-readable run record: plan.json always, apply.jsonl on write.
  // tmp/ is the only host-backed writable mount of the api container.
  const runId = `${basename(jsonlPath, '.jsonl')}-${new Date().toISOString().replace(/[:.]/g, '').slice(0, 17)}`
  const runDir = join('tmp/data-runs', runId)
  mkdirSync(runDir, { recursive: true })
  writeFileSync(
    join(runDir, 'plan.json'),
    `${JSON.stringify(
      {
        lot: jsonlPath,
        lotSha256: createHash('sha256').update(readFileSync(jsonlPath)).digest('hex'),
        mode: WRITE ? 'write' : 'dry-run',
        allowPartial: ALLOW_PARTIAL,
        counters: {
          rows: rows.length,
          candidates: candidates.length,
          skippedExisting,
          dupInDb,
          dupInLot,
          dropped,
          invalid,
        },
        blockers,
      },
      null,
      2
    )}\n`
  )
  console.log(`   plan : ${runDir}/plan.json`)

  // GATE A: a lot with blockers is refused as a whole — never a silent partial
  // apply. --allow-partial acknowledges the loss explicitly (kept in plan.json).
  if (blockers.length > 0) {
    if (!ALLOW_PARTIAL) {
      console.error(`\n✗ ${blockers.length} blocker(s) — lot refusé, rien n'a été écrit.`)
      console.error('  Corrige le lot, ou relance avec --allow-partial pour accepter la perte.')
      process.exit(1)
    }
    console.warn(`\n⚠ ${blockers.length} blocker(s) ignorés (--allow-partial)`)
  }

  if (!WRITE) {
    console.log('Run avec --write pour appliquer.')
    return
  }

  // The owner must pre-exist: an ingest run must never be able to mint an admin
  // account with a known password (or silently promote a mistyped email) on prod.
  const ownerEmail = process.env.SEED_OWNER_EMAIL ?? 'seed@seed.com'
  const owner = await getUser(db, ownerEmail)
  if (!owner) {
    throw new Error(
      `owner ${ownerEmail} not found — create it first (dev: just db-seed, prod: just db-prod-admin)`
    )
  }
  if (owner.role !== 'admin') {
    throw new Error(`owner ${ownerEmail} is not admin — refusing to promote it`)
  }

  const journalPath = join(runDir, 'apply.jsonl')
  writeFileSync(journalPath, '')
  let created = 0
  let failed = 0
  for (const c of candidates) {
    try {
      // One transaction per product: a race (concurrent write, slug collision)
      // still surfaces as a 23505 that aborts its whole transaction — per-row,
      // the failure skips one line instead of killing the run. Any non-ProductError
      // is unexpected and fail-fast on purpose (already-created rows stay committed).
      await withAdminRls((tx) => createProduct(owner.id, 'admin', c.input, tx, { autoTag: true }))
      created++
      appendFileSync(journalPath, `${JSON.stringify({ slug: c.slug, status: 'created' })}\n`)
    } catch (e) {
      if (e instanceof ProductError) {
        failed++
        appendFileSync(
          journalPath,
          `${JSON.stringify({ slug: c.slug, status: 'failed', code: e.code })}\n`
        )
        console.warn(`   ✗ ${c.slug}: ${e.code}`)
        continue
      }
      throw e
    }
  }

  console.log(`\n✅ ${created} créés · ${failed} échecs`)
  console.log(`   journal : ${journalPath}`)
  console.log('Prochaine étape : `just catalogue-gate` (audits + snapshot) puis commit data.sql.')
  if (failed > 0 && !ALLOW_PARTIAL) {
    console.error(`\n✗ ${failed} échec(s) write — lot partiellement appliqué, voir le journal.`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('\n💥 Erreur :', err instanceof Error ? err.message : err)
  process.exit(1)
})
