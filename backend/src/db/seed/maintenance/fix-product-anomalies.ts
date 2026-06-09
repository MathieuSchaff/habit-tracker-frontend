#!/usr/bin/env bun

/**
 * fix-product-anomalies.ts — one-off catalogue cleanup (2026-06-09).
 *
 *   1. delete junk import rows:
 *        - `azaaz-cera-ve` (CeraVe test garbage: name "azaaz", no INCI/source)
 *        - all `Nutripure` rows (mis-imported, wrong brand — to be re-scraped separately)
 *   2. normalize brand string `Tepe` -> `TePe` (split casing of the same Swedish brand)
 *   3. relink 2 Bioderma products whose Bunny webp exists but image_url is null
 *      (the 2 known CDN orphans) — no re-upload, just point image_url at the file.
 *
 * Deletes rely on ON DELETE CASCADE (tags / user_products / comparisons / ingredients /
 * edits). discussion_threads is ON DELETE RESTRICT — a product holding one is skipped, not
 * force-deleted.
 *
 * Usage:
 *   bun run src/db/seed/maintenance/fix-product-anomalies.ts          # dry-run
 *   bun run src/db/seed/maintenance/fix-product-anomalies.ts --write  # apply
 */

import { eq, inArray } from 'drizzle-orm'

import { db } from '../..'
import { withAdminRls } from '../../rls'
import { discussionThreads, products } from '../../schema'

const WRITE = process.argv.includes('--write')

const DELETE_SLUGS = ['azaaz-cera-ve']
const DELETE_BRANDS = ['Nutripure']
const BRAND_FIX = { from: 'Tepe', to: 'TePe' } as const
const RELINK_SLUGS = ['bioderma-sebium-global', 'bioderma-pigmentbio-c-concentrate']

// public CDN base — same convention as upload/lib.ts (IMAGE_CDN_BASE + prefix)
const CDN_BASE = (process.env.IMAGE_CDN_BASE ?? '').replace(/\/+$/, '')
const PREFIX = `${(process.env.BUNNY_STORAGE_PREFIX ?? 'products/').replace(/^\/+|\/+$/g, '')}/`
const cdnUrl = (slug: string) => `${CDN_BASE}/${PREFIX}${slug}.webp`

async function resolveDeletes() {
  const all = await db
    .select({ id: products.id, slug: products.slug, brand: products.brand, name: products.name })
    .from(products)
  const targets = all.filter(
    (p) => DELETE_SLUGS.includes(p.slug) || DELETE_BRANDS.includes(p.brand)
  )
  if (targets.length === 0) return { deletable: [], blocked: [] }

  const ids = targets.map((t) => t.id)
  const threads = await db
    .select({ productId: discussionThreads.productId })
    .from(discussionThreads)
    .where(inArray(discussionThreads.productId, ids))
  const blockedIds = new Set(threads.map((t) => t.productId).filter((x): x is string => !!x))

  return {
    deletable: targets.filter((t) => !blockedIds.has(t.id)),
    blocked: targets.filter((t) => blockedIds.has(t.id)),
  }
}

async function main() {
  const { deletable, blocked } = await resolveDeletes()

  console.log(`# delete (${deletable.length})`)
  for (const p of deletable) console.log(`  - ${p.brand} | ${p.name} (${p.slug})`)
  if (blocked.length) {
    console.log(`# SKIPPED — has discussion_threads (RESTRICT) (${blocked.length})`)
    for (const p of blocked) console.log(`  ! ${p.brand} | ${p.name} (${p.slug})`)
  }

  const toRename = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.brand, BRAND_FIX.from))
  console.log(`\n# brand rename '${BRAND_FIX.from}' -> '${BRAND_FIX.to}' (${toRename.length})`)

  const relinkTargets = await db
    .select({ id: products.id, slug: products.slug, imageUrl: products.imageUrl })
    .from(products)
    .where(inArray(products.slug, RELINK_SLUGS))
  console.log(`\n# relink (${relinkTargets.length})`)
  const relinkPlan: { id: string; url: string }[] = []
  for (const p of relinkTargets) {
    const url = cdnUrl(p.slug)
    if (!CDN_BASE) {
      console.log(`  ! ${p.slug}: IMAGE_CDN_BASE unset — cannot relink`)
      continue
    }
    if (p.imageUrl) {
      console.log(`  · ${p.slug}: already has image_url, skip`)
      continue
    }
    const head = await fetch(url, { method: 'HEAD' }).catch(() => null)
    if (!head?.ok) {
      console.log(`  ! ${p.slug}: ${url} -> ${head?.status ?? 'ERR'} (no file, skip)`)
      continue
    }
    console.log(`  - ${p.slug} -> ${url}`)
    relinkPlan.push({ id: p.id, url })
  }

  if (!WRITE) {
    console.log('\n[dry-run] re-run with --write to apply.')
    return
  }

  await withAdminRls(async (tx) => {
    if (deletable.length) {
      await tx.delete(products).where(
        inArray(
          products.id,
          deletable.map((p) => p.id)
        )
      )
    }
    if (toRename.length) {
      await tx
        .update(products)
        .set({ brand: BRAND_FIX.to })
        .where(eq(products.brand, BRAND_FIX.from))
    }
    for (const r of relinkPlan) {
      await tx.update(products).set({ imageUrl: r.url }).where(eq(products.id, r.id))
    }
  })

  console.log(
    `\napplied: deleted ${deletable.length}, renamed ${toRename.length}, relinked ${relinkPlan.length}.`
  )
  console.log('Run `just db-snapshot` then commit data.sql to persist.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
