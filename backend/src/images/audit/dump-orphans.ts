#!/usr/bin/env bun
/**
 * Dump all orphan images grouped by brand prefix to /tmp/orphan-images.txt.
 * Same matching logic as dry-run-image-upload.ts (kept inline to stay self-contained).
 */

import { readdirSync, writeFileSync } from 'node:fs'
import { basename, extname, join } from 'node:path'

import { allProductData } from '../../db/seed/data/products'

const IMAGES_DIR = join(import.meta.dir, '..', 'output', 'images')
const OUT_FILE = '/tmp/orphan-images.txt'

const VOLUME_UNITS = /^\d+(ml|cl|l|g|mg|kg)$/
const PACK_UNITS = /^\d+x\d+(ml|cl|l|g|mg|kg)$/
const BARE_UNITS = new Set(['ml', 'cl', 'l', 'g', 'mg', 'kg'])

function stripRetailerId(slug: string): string {
  return slug.replace(/-\d{5,7}$/, '')
}

function normalize(slug: string): string {
  const arr = stripRetailerId(slug).split('-').filter(Boolean)
  const out: string[] = []
  for (let i = 0; i < arr.length; i++) {
    const t = arr[i]
    if (VOLUME_UNITS.test(t) || PACK_UNITS.test(t)) {
      const prev = out[out.length - 1]
      const prev2 = out[out.length - 2]
      const blockedByClaim =
        prev2 !== undefined && (prev2 === 'en' || prev2 === 'in' || prev2 === 'n' || prev2 === 'no')
      if (prev !== undefined && /^\d+$/.test(prev) && !blockedByClaim) {
        out.pop()
        if (out.length && out[out.length - 1] === 'x') {
          out.pop()
          if (out.length && /^\d+$/.test(out[out.length - 1])) out.pop()
        }
      }
      continue
    }
    if (BARE_UNITS.has(t) && out.length && /^\d+$/.test(out[out.length - 1])) {
      out.pop()
      continue
    }
    if (t === 'lot' && arr[i + 1] === 'de') {
      const next = arr[i + 2]
      if (next && (PACK_UNITS.test(next) || /^\d+$/.test(next))) {
        i += 2
        continue
      }
    }
    if (t === 'spf' && /^\d+$/.test(arr[i + 1] ?? '')) {
      out.push(`spf${arr[i + 1]}`)
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

const exactLookup = new Map<string, string>()
const normLookup = new Map<string, string>()
const tokenKeyLookup = new Map<string, string>()
for (const p of allProductData) {
  exactLookup.set(p.slug, p.slug)
  const noId = stripRetailerId(p.slug)
  if (noId !== p.slug) exactLookup.set(noId, p.slug)
  const norm = normalize(p.slug)
  if (!normLookup.has(norm)) normLookup.set(norm, p.slug)
  const key = tokenKey(p.slug)
  if (!tokenKeyLookup.has(key)) tokenKeyLookup.set(key, p.slug)
}

const orphans: string[] = []
for (const file of readdirSync(IMAGES_DIR)) {
  const ext = extname(file)
  const rawSlug = basename(file, ext)
  if (exactLookup.has(rawSlug)) continue
  if (normLookup.has(normalize(rawSlug))) continue
  if (tokenKeyLookup.has(tokenKey(rawSlug))) continue
  orphans.push(file)
}

const byBrand = new Map<string, string[]>()
for (const f of orphans) {
  const brand = f.split('-')[0]
  const list = byBrand.get(brand) ?? []
  list.push(f)
  byBrand.set(brand, list)
}

const sortedBrands = [...byBrand.entries()].sort((a, b) => b[1].length - a[1].length)

const lines: string[] = []
lines.push(`# Orphan images (${orphans.length} total) — ${new Date().toISOString().slice(0, 10)}`)
lines.push('')
for (const [brand, files] of sortedBrands) {
  lines.push(`## ${brand} (${files.length})`)
  for (const f of files.sort()) lines.push(`  ${f}`)
  lines.push('')
}

writeFileSync(OUT_FILE, lines.join('\n'))
console.log(`Wrote ${orphans.length} orphans across ${byBrand.size} brand prefixes to ${OUT_FILE}`)
console.log('\nTop 20 brand prefixes:')
for (const [brand, files] of sortedBrands.slice(0, 20)) {
  console.log(`  ${brand.padEnd(20)} ${files.length}`)
}
