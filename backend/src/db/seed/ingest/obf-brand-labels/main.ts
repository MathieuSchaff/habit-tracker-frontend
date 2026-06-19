// T4.D — Open Beauty Facts brand-level label ingestion. Streams the OBF
// CSV dump (≈ 17 MB gz, ≈ 120 MB raw, ~64 k cosmetics rows), aggregates
// per-brand vegan / cruelty-free / natural claims, and merges them into
// `brand_certifications` with source `obf`. The manual seed (T4.B) is
// preserved : we only ADD evidence to a brand's `sources` jsonb and lift
// flags from false → true. We never overwrite a manual `true` to false.
//
// Decision rule (default): a brand-level claim fires when ≥ 50 % of the
// brand's OBF products carry the matching label AND the brand has ≥ 2
// products in OBF. Tunable via --threshold and --min.
//
// Whitelist scope: by default we only roll up brands present in
// `products.brand` (after slugification). Switch off with --no-whitelist
// to ingest every OBF brand (much larger result set, mostly irrelevant).
//
// Usage:
//   bun run backend/src/db/seed/ingest/obf-brand-labels/main.ts                   # dry-run, cached dump
//   bun run backend/src/db/seed/ingest/obf-brand-labels/main.ts --download        # force re-download
//   bun run backend/src/db/seed/ingest/obf-brand-labels/main.ts --write           # apply DB upserts
//   bun run backend/src/db/seed/ingest/obf-brand-labels/main.ts --threshold 0.7   # stricter ratio
//
// Cache lives at `backend/tmp/cache/obf/products.csv.gz` (gitignored). Re-
// running without --download reuses the cached file ; OBF refreshes the
// dump daily so a `--download` once a day is enough.

import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'

import { sql } from 'drizzle-orm'

import { db } from '../../..'
import { brandCertifications, products } from '../../../schema'
import type {
  BrandCertification,
  BrandCertificationInsert,
  BrandCertificationSources,
} from '../../../schema/products/brand-certifications'
import {
  aggregateBrandClaims,
  type BrandClaimRollup,
  brandToObfSlug,
  mergeObfSourcesIntoExisting,
  parseObfCsvLine,
  resolveObfColumns,
} from './lib'

const OBF_DUMP_URL =
  'https://static.openbeautyfacts.org/data/en.openbeautyfacts.org.products.csv.gz'
// Anchored to the script (not CWD): the recipe runs this in-container at
// /app/backend, where the bare 'backend/tmp/...' literal resolved to a
// doubled 'backend/backend/tmp/...'. Five levels up lands on the backend
// root, so cache lives under the gitignored backend/tmp/ from host or container.
const CACHE_DIR = join(import.meta.dir, '..', '..', '..', '..', '..', 'tmp', 'cache', 'obf')
const CACHE_FILE = join(CACHE_DIR, 'products.csv.gz')

const FORCE_DOWNLOAD = process.argv.includes('--download')
const WRITE = process.argv.includes('--write')
const NO_WHITELIST = process.argv.includes('--no-whitelist')
const RATIO_THRESHOLD = numericFlag('--threshold', 0.5)
const MIN_PRODUCTS = numericFlag('--min', 2)
const MIN_LABEL_COUNT = numericFlag('--min-label-count', 3)

function numericFlag(name: string, fallback: number): number {
  const i = process.argv.indexOf(name)
  if (i === -1) return fallback
  const raw = process.argv[i + 1]
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) {
    throw new Error(`Flag ${name} expects a number, got "${raw}"`)
  }
  return parsed
}

async function ensureDump(): Promise<Uint8Array> {
  if (FORCE_DOWNLOAD || !existsSync(CACHE_FILE)) {
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })
    console.log(`📥 Téléchargement du dump OBF (${OBF_DUMP_URL})...`)
    const res = await fetch(OBF_DUMP_URL)
    if (!res.ok) throw new Error(`Échec téléchargement OBF (HTTP ${res.status})`)
    const bytes = new Uint8Array(await res.arrayBuffer())
    await Bun.write(CACHE_FILE, bytes)
    const mb = (bytes.byteLength / 1024 / 1024).toFixed(1)
    console.log(`✅ Dump caché à ${CACHE_FILE} (${mb} MB)\n`)
    return bytes
  }
  console.log(`📂 Dump caché : ${CACHE_FILE}\n`)
  return new Uint8Array(await Bun.file(CACHE_FILE).arrayBuffer())
}

function* csvLines(rawCsv: string): Generator<string> {
  // Skip header line.
  let start = rawCsv.indexOf('\n') + 1
  if (start === 0) return
  while (start < rawCsv.length) {
    const nl = rawCsv.indexOf('\n', start)
    const end = nl === -1 ? rawCsv.length : nl
    yield rawCsv.slice(start, end)
    if (nl === -1) break
    start = nl + 1
  }
}

async function main() {
  console.log('🌐 Ingest OBF brand-level labels')
  console.log(
    `   mode=${WRITE ? 'WRITE' : 'DRY-RUN'} · ratio≥${RATIO_THRESHOLD}@n≥${MIN_PRODUCTS} OR count≥${MIN_LABEL_COUNT}${
      NO_WHITELIST ? ' · all-brands' : ' · corpus-only'
    }\n`
  )

  await db.execute(sql`SET LOCAL app.role = 'admin'`)

  // Whitelist : OBF slugs of brands actually in our corpus
  let whitelist: Set<string> | undefined
  let corpusSlugToDisplay: Map<string, string> | undefined
  if (!NO_WHITELIST) {
    const corpusBrands = await db.selectDistinct({ brand: products.brand }).from(products)
    corpusSlugToDisplay = new Map()
    for (const r of corpusBrands) {
      if (r.brand) corpusSlugToDisplay.set(brandToObfSlug(r.brand), r.brand)
    }
    whitelist = new Set(corpusSlugToDisplay.keys())
    console.log(`🎯 Whitelist : ${whitelist.size} marques uniques du corpus produits`)
  }

  // Decompress + parse
  const gz = await ensureDump()
  console.log('🗜  Décompression...')
  const raw = gunzipSync(gz)
  const text = new TextDecoder().decode(raw)
  console.log(`   ${(text.length / 1024 / 1024).toFixed(1)} MB décompressés\n`)

  const headerEnd = text.indexOf('\n')
  if (headerEnd === -1) throw new Error('OBF dump has no header row — empty or truncated download.')
  const columns = resolveObfColumns(text.slice(0, headerEnd))

  let rowCount = 0
  let parsedCount = 0
  const rows: { brandTags: string[]; labelTags: string[] }[] = []
  for (const line of csvLines(text)) {
    rowCount++
    const row = parseObfCsvLine(line, columns)
    if (row) {
      parsedCount++
      rows.push(row)
    }
  }
  console.log(`📊 OBF : ${rowCount} lignes · ${parsedCount} parsées avec brand|label`)

  const rollups = aggregateBrandClaims(rows, {
    ratioThreshold: RATIO_THRESHOLD,
    minProducts: MIN_PRODUCTS,
    minLabelCount: MIN_LABEL_COUNT,
    ...(whitelist ? { brandWhitelist: whitelist } : {}),
  })
  console.log(`   ${rollups.size} marques agrégées (post-whitelist)\n`)

  // Unmatched corpus brands
  // Corpus brands that produced zero OBF rows are usually a slug mismatch
  // between brandToObfSlug and OBF's canonical id (apostrophes, ampersands,
  // numbers) — a silent miss the ratio rule can never surface. List them so
  // the gap is auditable instead of invisible.
  if (whitelist && corpusSlugToDisplay) {
    const unmatched = [...whitelist].filter((slug) => !rollups.has(slug))
    console.log(`🔍 Corpus sans produit OBF : ${unmatched.length}/${whitelist.size}`)
    if (unmatched.length > 0) {
      const names = unmatched.map((slug) => corpusSlugToDisplay?.get(slug) ?? slug).sort()
      const shown = names.slice(0, 30)
      console.log(
        `   ${shown.join(', ')}${names.length > 30 ? ` … (+${names.length - 30})` : ''}\n`
      )
    }
  }

  // Per-claim summary
  let veganClaim = 0
  let crueltyFreeClaim = 0
  let naturalClaim = 0
  for (const r of rollups.values()) {
    if (r.vegan.claim) veganClaim++
    if (r.crueltyFree.claim) crueltyFreeClaim++
    if (r.naturalCertified.claim) naturalClaim++
  }
  console.log(`🏷  Claims OBF (post-rule) :`)
  console.log(`   vegan         : ${veganClaim}`)
  console.log(`   cruelty-free  : ${crueltyFreeClaim}`)
  console.log(`   natural-cert  : ${naturalClaim}\n`)

  if (process.argv.includes('--verbose')) {
    const claimed = [...rollups.values()].filter(
      (r) => r.vegan.claim || r.crueltyFree.claim || r.naturalCertified.claim
    )
    claimed.sort((a, b) => b.total - a.total)
    console.log('📋 Marques claimées (verbose) :')
    for (const r of claimed) {
      const flags = [
        r.vegan.claim ? `vegan(${r.vegan.count}/${r.total})` : '',
        r.crueltyFree.claim ? `cf(${r.crueltyFree.count}/${r.total})` : '',
        r.naturalCertified.claim ? `nat(${r.naturalCertified.count}/${r.total})` : '',
      ]
        .filter(Boolean)
        .join(' · ')
      console.log(`   ${r.obfSlug.padEnd(30)} ${flags}`)
    }
    console.log()
  }

  // Load existing brand_certifications + build merge plan
  const existing = await db.select().from(brandCertifications)
  const existingByObfSlug = new Map<string, BrandCertification>()
  for (const row of existing) {
    existingByObfSlug.set(brandToObfSlug(row.brandDisplay), row)
  }

  const inserts: BrandCertificationInsert[] = []
  const updates: { brandNormalized: string; row: BrandCertificationInsert }[] = []
  let liftedFlags = 0
  let mergedSources = 0
  let newRows = 0

  for (const rollup of rollups.values()) {
    const anyClaim = rollup.vegan.claim || rollup.crueltyFree.claim || rollup.naturalCertified.claim
    if (!anyClaim) continue

    const ex = existingByObfSlug.get(rollup.obfSlug)
    if (!ex) {
      // New brand discovered by OBF — store with display = obfSlug as fallback
      // (unknown true display name; admin can rename later via DB).
      newRows++
      inserts.push({
        brandNormalized: rollup.obfSlug,
        brandDisplay: rollup.obfSlug,
        isVegan: rollup.vegan.claim,
        isCrueltyFree: rollup.crueltyFree.claim,
        isNaturalCertified: rollup.naturalCertified.claim,
        sources: buildSourcesFromRollup(rollup),
        notes: `Auto-discovered via OBF dump (n=${rollup.total}, ratios v=${rollup.vegan.ratio.toFixed(2)} cf=${rollup.crueltyFree.ratio.toFixed(2)} nat=${rollup.naturalCertified.ratio.toFixed(2)}).`,
      })
      continue
    }

    // Existing row : merge sources jsonb + lift any false flag that OBF
    // newly asserts. Never flip a manual `true` → false.
    const newSources = mergeObfSourcesIntoExisting(ex.sources ?? {}, rollup)
    const sourcesChanged = JSON.stringify(newSources) !== JSON.stringify(ex.sources ?? {})

    const liftedVegan = !ex.isVegan && rollup.vegan.claim
    const liftedCF = !ex.isCrueltyFree && rollup.crueltyFree.claim
    const liftedNat = !ex.isNaturalCertified && rollup.naturalCertified.claim
    const flagsChanged = liftedVegan || liftedCF || liftedNat

    if (!sourcesChanged && !flagsChanged) continue

    if (flagsChanged) liftedFlags++
    if (sourcesChanged) mergedSources++

    updates.push({
      brandNormalized: ex.brandNormalized,
      row: {
        brandNormalized: ex.brandNormalized,
        brandDisplay: ex.brandDisplay,
        isVegan: ex.isVegan || rollup.vegan.claim,
        isCrueltyFree: ex.isCrueltyFree || rollup.crueltyFree.claim,
        isNaturalCertified: ex.isNaturalCertified || rollup.naturalCertified.claim,
        sources: newSources,
        notes: ex.notes,
      },
    })
  }

  console.log(`📝 Plan de merge :`)
  console.log(`   Nouvelles marques OBF (insert)        : ${newRows}`)
  console.log(`   Existantes — flags liftés false→true   : ${liftedFlags}`)
  console.log(`   Existantes — sources jsonb enrichies   : ${mergedSources}\n`)

  if (!WRITE) {
    console.log('Run avec --write pour appliquer.')
    return
  }

  // Write
  if (inserts.length > 0) {
    const CHUNK = 200
    for (let i = 0; i < inserts.length; i += CHUNK) {
      await db
        .insert(brandCertifications)
        .values(inserts.slice(i, i + CHUNK))
        .onConflictDoUpdate({
          target: brandCertifications.brandNormalized,
          set: {
            isVegan: sql`brand_certifications.is_vegan OR excluded.is_vegan`,
            isCrueltyFree: sql`brand_certifications.is_cruelty_free OR excluded.is_cruelty_free`,
            isNaturalCertified: sql`brand_certifications.is_natural_certified OR excluded.is_natural_certified`,
            sources: sql`coalesce(brand_certifications.sources, '{}'::jsonb) || excluded.sources`,
          },
        })
    }
    console.log(`✅ ${inserts.length} insert/upsert (nouvelles marques)`)
  }

  for (const u of updates) {
    await db
      .update(brandCertifications)
      .set({
        isVegan: u.row.isVegan,
        isCrueltyFree: u.row.isCrueltyFree,
        isNaturalCertified: u.row.isNaturalCertified,
        sources: u.row.sources,
      })
      .where(sql`${brandCertifications.brandNormalized} = ${u.brandNormalized}`)
  }
  console.log(`✅ ${updates.length} updates (existantes mergées)\n`)
}

function buildSourcesFromRollup(rollup: BrandClaimRollup): BrandCertificationSources {
  const out: BrandCertificationSources = {}
  if (rollup.vegan.claim) out.vegan = ['obf']
  if (rollup.crueltyFree.claim) out.cruelty_free = ['obf']
  if (rollup.naturalCertified.claim) out.natural = ['obf']
  return out
}

main().catch((err) => {
  console.error('\n💥 Erreur :', err instanceof Error ? err.message : err)
  if (err instanceof Error && err.stack) console.error(err.stack)
  process.exit(1)
})
