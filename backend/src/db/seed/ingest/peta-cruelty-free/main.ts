// T4.E: PETA Ultimate Cruelty-Free List ingestion. Targeted scraper :
// for each brand in our corpus + manual seed, probe
// `https://crueltyfree.peta.org/company/<slug>/` and treat 200 as a CF
// claim. Bounded request count (~ 220 brands) ; polite 250 ms delay
// keeps the run well under PETA rate limits and finishes in a minute.
//
// Cache : `backend/tmp/cache/peta/results.json` is a JSON dict
//   { [slug]: { status: 200|404, fetchedAt: iso } }
// Re-runs reuse cached statuses ; pass --refresh to force re-fetch.
//
// Audit : the runner cross-checks our manual seed (T4.B). If a brand is
// seeded with `peta` in `sources.cruelty_free` but PETA's site says
// not-listed, the runner emits a warning and (with --strict-prune) drops
// `peta` from sources jsonb. Default behaviour is warn-only. Manual
// seed claims may still be valid via Vegan Society / Leaping Bunny so
// we don't strip them by default.
//
// Usage:
//   bun run backend/src/db/seed/ingest/peta-cruelty-free/main.ts                # dry-run, cached
//   bun run backend/src/db/seed/ingest/peta-cruelty-free/main.ts --refresh      # re-fetch all
//   bun run backend/src/db/seed/ingest/peta-cruelty-free/main.ts --write        # apply DB upserts
//   bun run backend/src/db/seed/ingest/peta-cruelty-free/main.ts --strict-prune # also remove stale `peta` from sources

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { sql } from 'drizzle-orm'

import { db } from '../../..'
import { withAdminRls } from '../../../rls'
import { brandCertifications, products } from '../../../schema'
import {
  type BrandCertificationSource,
  type BrandCertificationSources,
  normalizeBrand,
} from '../../../schema/products/brand-certifications'
import { decidePetaStatus, type PerSlugStatus, parsePetaPageStatus, petaSlugVariants } from './lib'

// Anchored to the script (not CWD): the recipe runs this in-container at
// /app/backend, where the bare 'backend/tmp/...' literal resolved to a
// doubled 'backend/backend/tmp/...'. Five levels up lands on the backend
// root, so cache lives under the gitignored backend/tmp/ from host or container.
const CACHE_DIR = join(import.meta.dir, '..', '..', '..', '..', '..', 'tmp', 'cache', 'peta')
const CACHE_FILE = join(CACHE_DIR, 'results.json')
const POLITE_DELAY_MS = 250

const REFRESH = process.argv.includes('--refresh')
const WRITE = process.argv.includes('--write')
const STRICT_PRUNE = process.argv.includes('--strict-prune')

interface CacheEntry {
  httpCode: number
  pageStatus: 'cruelty-free' | 'not-cf' | 'unknown' | null
  fetchedAt: string
}

function loadCache(): Map<string, CacheEntry> {
  if (!existsSync(CACHE_FILE)) return new Map()
  try {
    const json = JSON.parse(readFileSync(CACHE_FILE, 'utf-8')) as Record<string, CacheEntry>
    return new Map(Object.entries(json))
  } catch {
    console.warn(`⚠️  Cache illisible (${CACHE_FILE}), reset.`)
    return new Map()
  }
}

function saveCache(cache: Map<string, CacheEntry>) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })
  const json = Object.fromEntries(cache)
  writeFileSync(CACHE_FILE, JSON.stringify(json, null, 2))
}

async function probeOne(
  slug: string
): Promise<{ httpCode: number; pageStatus: ReturnType<typeof parsePetaPageStatus> | null }> {
  const url = `https://crueltyfree.peta.org/company/${slug}/`
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'aurore-cli/1.0 (brand-cert ingestion)' },
    })
    const httpCode = res.status
    if (httpCode !== 200) return { httpCode, pageStatus: null }
    const body = await res.text()
    return { httpCode, pageStatus: parsePetaPageStatus(body) }
  } catch {
    return { httpCode: 0, pageStatus: null }
  }
}

async function main() {
  console.log('🐰 Ingest PETA Cruelty-Free List')
  console.log(
    `   mode=${WRITE ? 'WRITE' : 'DRY-RUN'} · ${REFRESH ? 'force-refresh' : 'use-cache'}${
      STRICT_PRUNE ? ' · strict-prune' : ''
    }\n`
  )

  // Build the brand list to probe : corpus ∪ manual seed
  const { corpusBrands, seedRows } = await withAdminRls(async (tx) => ({
    corpusBrands: await tx.selectDistinct({ brand: products.brand }).from(products),
    seedRows: await tx.select().from(brandCertifications),
  }))
  const brandSet = new Map<string, string>() // normalized → display
  for (const r of corpusBrands) {
    brandSet.set(normalizeBrand(r.brand), r.brand)
  }
  for (const s of seedRows) {
    if (!brandSet.has(s.brandNormalized)) brandSet.set(s.brandNormalized, s.brandDisplay)
  }
  console.log(
    `🎯 ${brandSet.size} marques à sonder (corpus ${corpusBrands.length} ∪ seed ${seedRows.length})`
  )

  // Probe
  const cache = loadCache()
  let probed = 0
  let cached = 0
  const perBrand = new Map<string, { display: string; statuses: Map<string, PerSlugStatus> }>()

  for (const [brandNormalized, display] of brandSet) {
    const variants = petaSlugVariants(display)
    const statuses = new Map<string, PerSlugStatus>()

    for (const slug of variants) {
      let entry = cache.get(slug)
      // Cache invalidation : the v1 cache stored only HTTP code (no
      // pageStatus). Treat such entries as misses to force re-fetch with
      // the body parser.
      const cacheUsable = entry && (entry.httpCode === 404 || entry.pageStatus !== null)
      if (REFRESH || !cacheUsable) {
        const r = await probeOne(slug)
        // Don't cache transient errors, only definitive 200/404.
        if (r.httpCode === 200 || r.httpCode === 404) {
          entry = {
            httpCode: r.httpCode,
            pageStatus: r.pageStatus,
            fetchedAt: new Date().toISOString(),
          }
          cache.set(slug, entry)
        } else {
          console.warn(`   ⚠️  ${slug}: HTTP ${r.httpCode} (skipped)`)
        }
        probed++
        await new Promise((r) => setTimeout(r, POLITE_DELAY_MS))
      } else {
        cached++
      }
      if (entry) {
        statuses.set(slug, { httpCode: entry.httpCode, pageStatus: entry.pageStatus })
      }
      // Short-circuit on confirmed cruelty-free. No need to probe alternates.
      if (entry?.pageStatus === 'cruelty-free') break
    }

    perBrand.set(brandNormalized, { display, statuses })
  }

  saveCache(cache)
  console.log(`   ${probed} fetch · ${cached} cache hit · cache: ${CACHE_FILE}\n`)

  // Classify
  const listed: { brandNormalized: string; display: string; matchedSlug: string }[] = []
  const notListed: { brandNormalized: string; display: string }[] = []

  for (const [brandNormalized, info] of perBrand) {
    const status = decidePetaStatus(info.statuses)
    if (status === 'cruelty-free') {
      const matchedSlug =
        [...info.statuses.entries()].find(([, s]) => s.pageStatus === 'cruelty-free')?.[0] ?? '?'
      listed.push({ brandNormalized, display: info.display, matchedSlug })
    } else if (status === 'not-listed') {
      notListed.push({ brandNormalized, display: info.display })
    }
  }

  console.log(`📊 Statuts :`)
  console.log(`   listed (cruelty-free) : ${listed.length}`)
  console.log(`   not on PETA's CF list : ${notListed.length}\n`)

  // Audit manual seed for stale `peta` citations
  const seedByNormalized = new Map(seedRows.map((r) => [r.brandNormalized, r]))
  const staleCitations: { display: string }[] = []
  for (const nl of notListed) {
    const seed = seedByNormalized.get(nl.brandNormalized)
    if (!seed) continue
    const sources = (seed.sources ?? {}) as BrandCertificationSources
    if (sources.cruelty_free?.includes('peta')) {
      staleCitations.push({ display: seed.brandDisplay })
    }
  }
  if (staleCitations.length > 0) {
    console.log(`⚠️  Citations PETA potentiellement stale dans le seed manuel :`)
    for (const s of staleCitations) {
      console.log(`   ${s.display}`)
    }
    console.log(
      `   (${STRICT_PRUNE ? 'seront retirées' : 'gardées — passe --strict-prune pour les retirer'})\n`
    )
  }

  // Build merge plan
  let toLift = 0
  let toEnrich = 0
  let toInsert = 0
  const liftUpdates: {
    brandNormalized: string
    display: string
    sources: BrandCertificationSources
  }[] = []
  const newRows: {
    brandNormalized: string
    display: string
    sources: BrandCertificationSources
  }[] = []

  for (const l of listed) {
    const seed = seedByNormalized.get(l.brandNormalized)
    if (!seed) {
      // New brand discovered by PETA (e.g., a corpus brand we hadn't seeded).
      toInsert++
      newRows.push({
        brandNormalized: l.brandNormalized,
        display: l.display,
        sources: { cruelty_free: ['peta'] },
      })
      continue
    }
    const sources = (seed.sources ?? {}) as BrandCertificationSources
    const wasFalse = !seed.isCrueltyFree
    const lacksPeta = !(sources.cruelty_free?.includes('peta') ?? false)
    if (wasFalse) toLift++
    if (lacksPeta) toEnrich++
    if (wasFalse || lacksPeta) {
      const newCfSources = ((sources.cruelty_free ?? []) as BrandCertificationSource[]).slice()
      if (!newCfSources.includes('peta')) newCfSources.push('peta')
      liftUpdates.push({
        brandNormalized: seed.brandNormalized,
        display: seed.brandDisplay,
        sources: { ...sources, cruelty_free: newCfSources },
      })
    }
  }

  // Strict-prune : remove `peta` from sources of brands seeded with PETA
  // citation but not actually on the list. Apply only with the flag.
  const pruneUpdates: { brandNormalized: string; sources: BrandCertificationSources }[] = []
  if (STRICT_PRUNE) {
    for (const stale of staleCitations) {
      const seed = seedByNormalized.get(normalizeBrand(stale.display))
      if (!seed) continue
      const sources = (seed.sources ?? {}) as BrandCertificationSources
      const filteredCf = (sources.cruelty_free ?? []).filter((s) => s !== 'peta')
      const newSources: BrandCertificationSources = { ...sources }
      if (filteredCf.length > 0) newSources.cruelty_free = filteredCf
      else delete newSources.cruelty_free
      pruneUpdates.push({ brandNormalized: seed.brandNormalized, sources: newSources })
    }
  }

  console.log(`📝 Plan de merge :`)
  console.log(`   Nouvelles marques PETA (insert)              : ${toInsert}`)
  console.log(`   Existantes — flag CF lifté false→true        : ${toLift}`)
  console.log(`   Existantes — sources jsonb enrichies (peta)  : ${toEnrich}`)
  if (STRICT_PRUNE) {
    console.log(`   Stale citations 'peta' supprimées            : ${pruneUpdates.length}`)
  }
  console.log()

  if (!WRITE) {
    console.log('Run avec --write pour appliquer.')
    return
  }

  // Write
  if (newRows.length > 0) {
    await db
      .insert(brandCertifications)
      .values(
        newRows.map((r) => ({
          brandNormalized: r.brandNormalized,
          brandDisplay: r.display,
          isVegan: false,
          isCrueltyFree: true,
          isNaturalCertified: false,
          sources: r.sources,
          notes: 'Auto-discovered via PETA Ultimate Cruelty-Free List.',
        }))
      )
      .onConflictDoUpdate({
        target: brandCertifications.brandNormalized,
        set: {
          isCrueltyFree: sql`true`,
          sources: sql`coalesce(brand_certifications.sources, '{}'::jsonb) || excluded.sources`,
        },
      })
    console.log(`✅ ${newRows.length} insert (nouvelles marques PETA-only)`)
  }

  for (const u of liftUpdates) {
    await db
      .update(brandCertifications)
      .set({ isCrueltyFree: true, sources: u.sources })
      .where(sql`${brandCertifications.brandNormalized} = ${u.brandNormalized}`)
  }
  console.log(`✅ ${liftUpdates.length} updates (existantes — flag/sources)`)

  for (const u of pruneUpdates) {
    await db
      .update(brandCertifications)
      .set({ sources: u.sources })
      .where(sql`${brandCertifications.brandNormalized} = ${u.brandNormalized}`)
  }
  if (STRICT_PRUNE) console.log(`✅ ${pruneUpdates.length} prune (stale peta citations)`)
}

main().catch((err) => {
  console.error('\n💥 Erreur :', err instanceof Error ? err.message : err)
  if (err instanceof Error && err.stack) console.error(err.stack)
  process.exit(1)
})
