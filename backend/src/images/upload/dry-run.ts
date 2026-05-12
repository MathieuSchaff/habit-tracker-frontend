#!/usr/bin/env bun
/**
 * Dry-run: maps local output/images/ files to product slugs.
 * Shows what an S3 upload would rename/skip without touching anything.
 *
 * Usage:
 *   bun run backend/src/images/upload/dry-run.ts
 *   bun run backend/src/images/upload/dry-run.ts --verbose
 */

import { readdirSync } from 'node:fs'
import { basename, extname, join } from 'node:path'

import { allProductData } from '../../db/seed/data/products'

const VERBOSE = process.argv.includes('--verbose')
const IMAGES_DIR = join(import.meta.dir, '..', 'output', 'images')

// Token-level normalize: drop trailing retailer IDs, then split on `-` and remove
// any token that encodes volume / pack / sample size. Handles cases the legacy
// suffix-only regex missed (volume mid-slug, lot prefix, combo packs, dual sizes).
const VOLUME_UNITS = /^\d+(ml|cl|l|g|mg|kg)$/
const PACK_UNITS = /^\d+x\d+(ml|cl|l|g|mg|kg)$/
const BARE_UNITS = new Set(['ml', 'cl', 'l', 'g', 'mg', 'kg'])
const PURE_NUMBER_AFTER_SPF = /^\d+$/

function stripRetailerId(slug: string): string {
  return slug.replace(/-\d{5,7}$/, '')
}

// Pre-merge tokens that get split by `-` but belong together:
// - "n-5g" (numéro suffix like N°5G) → "n5g"
// - "l-ortie", "d-haleine" (French apostrophe elision) → "lortie", "dhaleine"
function premergeTokens(arr: string[]): string[] {
  const merged: string[] = []
  for (let i = 0; i < arr.length; i++) {
    const t = arr[i]
    const next = arr[i + 1]
    if ((t === 'n' || t === 'no') && next && /^[0-9a-z]{1,4}$/.test(next)) {
      merged.push(t + next)
      i++
      continue
    }
    if ((t === 'l' || t === 'd') && next && /^[aeiouhy][a-z]+$/.test(next)) {
      merged.push(t + next)
      i++
      continue
    }
    merged.push(t)
  }
  return merged
}

function normalize(slug: string): string {
  const tokens = premergeTokens(stripRetailerId(slug).split('-').filter(Boolean))
  const out: string[] = []
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    // Volume / pack token: collapse decimal (`-4-5g` = 4.5g) and multipack (`-2-x-4-8g`)
    // forms by popping a preceding digit, but only if it's at the start or follows
    // another digit/`x` — otherwise we'd eat the `1` from "3-en-1-500ml".
    // Decimal volume: pop a SINGLE-digit prev (e.g. `4-5g` = 4.5g). Multi-digit prev
    // is left alone — it's typically a product designation (`mask-15-30ml`, `1-0-200ml`).
    // Direct multipack `N-x-M(unit)` also collapses.
    if (VOLUME_UNITS.test(t) || PACK_UNITS.test(t)) {
      const prev = out[out.length - 1]
      const prev2 = out[out.length - 2]
      const blockedByClaim =
        prev2 !== undefined && (prev2 === 'en' || prev2 === 'in' || prev2 === 'n' || prev2 === 'no')
      if (prev !== undefined && /^[0-9]$/.test(prev) && !blockedByClaim) {
        out.pop()
        if (out.length && out[out.length - 1] === 'x') {
          out.pop()
          if (out.length && /^[0-9]$/.test(out[out.length - 1])) out.pop()
        }
      } else if (prev === 'x' && prev2 !== undefined && /^\d+$/.test(prev2)) {
        out.pop()
        out.pop()
      }
      continue
    }
    // Bare unit after a digit OR after a `NxM` pack-without-unit token: drop both.
    if (BARE_UNITS.has(t) && out.length) {
      const prev = out[out.length - 1]
      if (/^\d+$/.test(prev) || /^\d+x\d+$/.test(prev)) {
        out.pop()
        continue
      }
    }
    // "lot-de-..." consumes any chain of digits / `x` / volume / pack tokens that follow.
    if (t === 'lot' && tokens[i + 1] === 'de') {
      let j = i + 2
      while (
        j < tokens.length &&
        (/^\d+$/.test(tokens[j]) ||
          tokens[j] === 'x' ||
          VOLUME_UNITS.test(tokens[j]) ||
          PACK_UNITS.test(tokens[j]) ||
          BARE_UNITS.has(tokens[j]))
      ) {
        j++
      }
      if (j > i + 2) {
        i = j - 1
        continue
      }
    }
    // "spf-30" preserved as `spf30` token elsewhere; if seen as raw "spf" then "30",
    // keep both (concentration matters for matching).
    if (t === 'spf' && PURE_NUMBER_AFTER_SPF.test(tokens[i + 1] ?? '')) {
      out.push(`spf${tokens[i + 1]}`)
      i += 1
      continue
    }
    out.push(t)
  }
  return out.join('-')
}

function tokenKey(slug: string): string {
  return normalize(slug).split('-').sort().join('-')
}

// Build lookups: each product slug indexed at 3 levels (exact, normalized, token-set).
// Token-set is many-to-one in theory (volume variants collapse), so use the FIRST
// product seen for that key — surplus images become "stripped" matches against
// whichever variant already covers the slot.
const exactLookup = new Map<string, string>()
const normalizedLookup = new Map<string, string>()
const tokenKeyLookup = new Map<string, string>()
for (const p of allProductData) {
  exactLookup.set(p.slug, p.slug)
  const noId = stripRetailerId(p.slug)
  if (noId !== p.slug) exactLookup.set(noId, p.slug)
  const norm = normalize(p.slug)
  if (!normalizedLookup.has(norm)) normalizedLookup.set(norm, p.slug)
  const key = tokenKey(p.slug)
  if (!tokenKeyLookup.has(key)) tokenKeyLookup.set(key, p.slug)
}

const imageFiles = readdirSync(IMAGES_DIR)

type MatchResult =
  | { status: 'exact'; imageFile: string; slug: string; s3Key: string }
  | {
      status: 'stripped'
      imageFile: string
      rawSlug: string
      slug: string
      s3Key: string
      via: 'normalize' | 'token-set'
    }
  | { status: 'no_match'; imageFile: string; rawSlug: string }

const results: MatchResult[] = []

for (const file of imageFiles) {
  const ext = extname(file)
  const rawSlug = basename(file, ext)

  const exact = exactLookup.get(rawSlug)
  if (exact) {
    results.push({
      status: 'exact',
      imageFile: file,
      slug: exact,
      s3Key: `products/${exact}${ext}`,
    })
    continue
  }

  const norm = normalize(rawSlug)
  const normMatch = normalizedLookup.get(norm)
  if (normMatch) {
    results.push({
      status: 'stripped',
      imageFile: file,
      rawSlug,
      slug: normMatch,
      s3Key: `products/${normMatch}${ext}`,
      via: 'normalize',
    })
    continue
  }

  const key = tokenKey(rawSlug)
  const keyMatch = tokenKeyLookup.get(key)
  if (keyMatch) {
    results.push({
      status: 'stripped',
      imageFile: file,
      rawSlug,
      slug: keyMatch,
      s3Key: `products/${keyMatch}${ext}`,
      via: 'token-set',
    })
    continue
  }

  results.push({ status: 'no_match', imageFile: file, rawSlug })
}

const exact = results.filter((r) => r.status === 'exact')
const stripped = results.filter((r) => r.status === 'stripped') as Extract<
  MatchResult,
  { status: 'stripped' }
>[]
const noMatch = results.filter((r) => r.status === 'no_match')

const matchedSlugs = new Set([
  ...exact.map((r) => (r as Extract<MatchResult, { status: 'exact' }>).slug),
  ...stripped.map((r) => r.slug),
])
const productsWithoutImage = allProductData.filter((p) => !matchedSlugs.has(p.slug))
const orphans = noMatch

const strippedViaNormalize = stripped.filter((r) => r.via === 'normalize')
const strippedViaTokenSet = stripped.filter((r) => r.via === 'token-set')

// --- Output ---

console.log('\n=== DRY RUN: Image → S3 mapping ===\n')
console.log(`Images found:          ${imageFiles.length}`)
console.log(`  exact match:         ${exact.length}`)
console.log(`  match after strip:   ${stripped.length}`)
console.log(`    via normalize:     ${strippedViaNormalize.length}`)
console.log(`    via token-set:     ${strippedViaTokenSet.length}`)
console.log(`  orphans (no match):  ${orphans.length}`)
console.log(`\nProducts total:        ${allProductData.length}`)
console.log(`  with image:          ${matchedSlugs.size}`)
console.log(`  without image:       ${productsWithoutImage.length}`)

if (VERBOSE) {
  if (strippedViaTokenSet.length > 0) {
    console.log('\n--- Token-set matches (token reorder, sample 30) ---')
    strippedViaTokenSet.slice(0, 30).forEach((r) => {
      console.log(`  ${r.imageFile}  →  ${r.slug}`)
    })
  }

  if (orphans.length > 0) {
    console.log('\n--- Orphan images / not yet imported (sample 30) ---')
    for (const r of orphans.slice(0, 30)) console.log(`  ${r.imageFile}`)
  }

  if (productsWithoutImage.length > 0) {
    console.log('\n--- Products without image (sample 30) ---')
    for (const p of productsWithoutImage.slice(0, 30)) console.log(`  ${p.slug}`)
  }
}
