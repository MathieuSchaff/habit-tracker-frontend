#!/usr/bin/env bun
/**
 * patch-image-urls.ts — Set imageUrl on seed products from image-mapping.json.
 *
 * For each slug present in output/image-mapping.json, rewrites the product's
 * imageUrl in data/products/**\/*.seed.ts to:
 *   ${IMAGE_CDN_BASE}/products/<slug>.webp
 *
 * The CDN base is resolved at patch time and written as a literal string.
 * Re-run with a different IMAGE_CDN_BASE to migrate.
 *
 * Behaviour:
 *   - Existing imageUrl line (single or multi-line) → replaced.
 *   - No imageUrl line → inserted just after the `url:` line, or before `tags:`.
 *   - Slugs not in mapping → untouched.
 *
 * Required env:
 *   IMAGE_CDN_BASE   e.g. https://cdn.example.com  (no trailing slash)
 *
 * Usage:
 *   bun run backend/src/images/maintenance/patch-urls.ts --dry
 *   IMAGE_CDN_BASE=https://cdn.example.com bun run backend/src/images/maintenance/patch-urls.ts
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DRY = process.argv.includes('--dry')
const SEED_ROOT = join(import.meta.dir, '..')
const PRODUCTS_DIR = join(SEED_ROOT, 'data', 'products')
const MAPPING_PATH = join(SEED_ROOT, 'output', 'image-mapping.json')

const CDN_BASE = (process.env.IMAGE_CDN_BASE ?? '').replace(/\/+$/, '')
if (!DRY && !CDN_BASE) {
  console.error('missing env IMAGE_CDN_BASE — pass --dry to preview without it')
  process.exit(1)
}
const BASE = CDN_BASE || 'https://CDN_PLACEHOLDER'

type Mapping = { mapping: Record<string, unknown> }
const mapping = (JSON.parse(readFileSync(MAPPING_PATH, 'utf8')) as Mapping).mapping
const SLUGS = new Set(Object.keys(mapping))
console.log(`mapping: ${SLUGS.size} slugs`)

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (name.endsWith('.seed.ts')) out.push(p)
  }
  return out
}

const files = walk(PRODUCTS_DIR)
console.log(`seed files: ${files.length}`)

const SLUG_RE = /^(\s*)slug:\s*'([^']+)'/
const URL_RE = /^(\s*)url:\s*'[^']*',?\s*$/
const TAGS_RE = /^(\s*)tags:\s*\{/

let totalReplaced = 0
let totalInserted = 0
let totalSkipped = 0
let totalUntouched = 0

for (const file of files) {
  const src = readFileSync(file, 'utf8')
  const lines = src.split('\n')

  // pass 1 — find product blocks: collect (startLineIdx, slug)
  type Block = { start: number; slug: string }
  const blocks: Block[] = []
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(SLUG_RE)
    if (m) blocks.push({ start: i, slug: m[2] })
  }

  if (blocks.length === 0) continue

  // pass 2 — patch from bottom to keep indices valid
  let replacedF = 0
  let insertedF = 0
  let skippedF = 0
  for (let b = blocks.length - 1; b >= 0; b--) {
    const { start, slug } = blocks[b]
    if (!SLUGS.has(slug)) {
      totalUntouched++
      continue
    }
    const newUrl = `${BASE}/products/${slug}.webp`
    const end = b + 1 < blocks.length ? blocks[b + 1].start : lines.length
    const indent = lines[start].match(/^(\s*)/)?.[1] ?? '    '

    // search imageUrl in [start, end)
    let imgIdx = -1
    let imgEndIdx = -1
    for (let i = start; i < end; i++) {
      if (/^\s*imageUrl:/.test(lines[i])) {
        imgIdx = i
        // single-line ending with quote+comma
        if (/'\s*,?\s*$/.test(lines[i])) {
          imgEndIdx = i
        } else {
          // multi-line — find closing quote
          for (let j = i + 1; j < end; j++) {
            if (/'\s*,?\s*$/.test(lines[j])) {
              imgEndIdx = j
              break
            }
          }
        }
        break
      }
    }

    if (imgIdx >= 0 && imgEndIdx >= imgIdx) {
      lines.splice(imgIdx, imgEndIdx - imgIdx + 1, `${indent}imageUrl: '${newUrl}',`)
      replacedF++
      totalReplaced++
    } else {
      // insert: prefer just after url: line, else before tags:
      let insertAt = -1
      for (let i = start; i < end; i++) {
        if (URL_RE.test(lines[i])) {
          insertAt = i + 1
          break
        }
      }
      if (insertAt < 0) {
        for (let i = start; i < end; i++) {
          if (TAGS_RE.test(lines[i])) {
            insertAt = i
            break
          }
        }
      }
      if (insertAt < 0) {
        skippedF++
        totalSkipped++
        continue
      }
      lines.splice(insertAt, 0, `${indent}imageUrl: '${newUrl}',`)
      insertedF++
      totalInserted++
    }
  }

  if (replacedF + insertedF === 0) continue
  if (!DRY) writeFileSync(file, lines.join('\n'))
  console.log(
    `  ${file.replace(SEED_ROOT, '.')}: replaced=${replacedF} inserted=${insertedF}` +
      (skippedF ? ` skipped=${skippedF}` : '')
  )
}

console.log(
  `\ntotals: replaced=${totalReplaced} inserted=${totalInserted} skipped=${totalSkipped} untouched=${totalUntouched}`
)
console.log(DRY ? '(dry run — no files written)' : `wrote with base ${BASE}`)
