#!/usr/bin/env bun
/**
 * Append a slug-tail parenthetical to the name when (name, brand) collides
 * between seed entries with no volume suffix. Idempotent: skips names that
 * already end with `(...)`.
 *
 * Usage:
 *   bun run backend/src/db/seed/maintenance/disambiguate-product-names.ts          # dry-run
 *   bun run backend/src/db/seed/maintenance/disambiguate-product-names.ts --write  # apply
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { type Entry, parseEntries, walk } from './_seed-parse'

const WRITE = process.argv.includes('--write')
const SEED_ROOT = join(import.meta.dir, '..')
const PRODUCTS_DIR = join(SEED_ROOT, 'data', 'products')

// Words requiring French accent restoration (slugs are ASCII).
const ACCENT_RESTORE: Record<string, string> = {
  apres: 'Après',
  apaisant: 'Apaisant',
  apaisante: 'Apaisante',
  doree: 'Dorée',
  dore: 'Doré',
  efficacite: 'Efficacité',
  legere: 'Légère',
  leger: 'Léger',
  seche: 'Sèche',
  seches: 'Sèches',
  toucher: 'Toucher',
}

function commonSegmentPrefix(strs: string[]): string[] {
  if (strs.length === 0) return []
  const segs = strs.map((s) => s.split('-'))
  const out: string[] = []
  const minLen = Math.min(...segs.map((a) => a.length))
  for (let i = 0; i < minLen; i++) {
    const first = segs[0]?.[i]
    if (segs.every((a) => a[i] === first)) out.push(first as string)
    else break
  }
  return out
}

function titleWord(w: string): string {
  const lower = w.toLowerCase()
  if (lower in ACCENT_RESTORE) return ACCENT_RESTORE[lower] as string
  if (/^\d+$/.test(lower)) return lower
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function tailToLabel(tail: string): string {
  if (!tail) return ''
  return tail.split('-').map(titleWord).join(' ')
}

const files = walk(PRODUCTS_DIR)
console.log(`scanning ${files.length} seed files…\n`)

let totalPatched = 0
const skipped: string[] = []

for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const entries = parseEntries(text)
  const lines = text.split('\n')

  const groups = new Map<string, Entry[]>()
  for (const e of entries) {
    const key = `${e.name.toLowerCase()}|${e.brand.toLowerCase()}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)?.push(e)
  }

  const patches: Array<{ line: number; from: string; to: string; slug: string }> = []

  for (const [key, list] of groups) {
    if (list.length < 2) continue

    // Skip groups already disambiguated (any name ends with parenthetical).
    if (list.some((e) => /\([^)]+\)\s*$/.test(e.name))) {
      skipped.push(`  ${file.replace(PRODUCTS_DIR, '.')} [${key}] already disambiguated`)
      continue
    }

    const prefixSegs = commonSegmentPrefix(list.map((e) => e.slug))
    const tails = list.map((e) => e.slug.split('-').slice(prefixSegs.length).join('-'))

    if (tails.every((t) => t === '')) {
      skipped.push(`  ${file.replace(PRODUCTS_DIR, '.')} [${key}] no diff tail (identical slugs?)`)
      continue
    }

    for (let i = 0; i < list.length; i++) {
      const entry = list[i]
      if (!entry) continue
      const tail = tails[i] ?? ''
      if (!tail) continue

      const label = tailToLabel(tail)
      const newName = `${entry.name} (${label})`

      // Handle both ' and " quotes when locating the name line.
      for (let l = entry.start; l <= entry.end; l++) {
        const ln = lines[l] ?? ''
        const lmS = ln.match(/^(\s+name:\s*')([^']+)('.*)$/)
        const lmD = ln.match(/^(\s+name:\s*")([^"]+)(".*)$/)
        const lm = lmS ?? lmD
        if (lm) {
          // If name contains apostrophe, must use double quotes.
          const useDouble = newName.includes("'")
          const open = useDouble ? '"' : "'"
          const close = useDouble ? '"' : "'"
          const head = (lm[1] ?? '').replace(/['"]$/, open)
          const tail = (lm[3] ?? '').replace(/^['"]/, close)
          patches.push({
            line: l,
            from: ln,
            to: `${head}${newName}${tail}`,
            slug: entry.slug,
          })
          break
        }
      }
    }
  }

  if (patches.length === 0) continue

  console.log(`${file.replace(PRODUCTS_DIR, '.')}`)
  for (const p of patches) {
    const oldName = p.from.match(/name:\s*'([^']+)'/)?.[1] ?? ''
    const newName = p.to.match(/name:\s*'([^']+)'/)?.[1] ?? ''
    console.log(`  L${p.line + 1}  ${p.slug}\n    "${oldName}"\n    → "${newName}"`)
    totalPatched++
  }

  if (WRITE) {
    for (const p of patches) lines[p.line] = p.to
    writeFileSync(file, lines.join('\n'))
  }
}

console.log(`\n${WRITE ? 'patched' : '[DRY] would patch'}: ${totalPatched}`)
if (skipped.length > 0) {
  console.log(`skipped: ${skipped.length}`)
  for (const s of skipped.slice(0, 10)) console.log(s)
}
