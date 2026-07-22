#!/usr/bin/env bun

// Backfill ingredient_dermo_profiles (comedogenicity, functions) from algo-derm
// evidence, joined via ingredients.canonical_key. Run catalog-backfill-canonical-key
// first. --write to apply, default dry-run.

import { MERGED_EVIDENCE_DB } from 'algo-derm/engine'

import { db } from '../..'
import { withAdminRls } from '../../rls'
import { ingredientDermoProfiles } from '../../schema/ingredients/ingredient-dermo-profiles'
import { ingredients } from '../../schema/ingredients/ingredients'

const WRITE = process.argv.includes('--write')

const slugify = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

type Patch = { comedogenicity?: number; functions?: string[] }

const patchByKey = new Map<string, Patch>()
for (const rec of Object.values(MERGED_EVIDENCE_DB)) {
  const patch: Patch = {}
  const comedo = rec.risk.comedogenicity
  if (comedo !== undefined) {
    // guard the DB CHECK (0-5): one bad upstream record must not abort the tx
    if (Number.isInteger(comedo) && comedo >= 0 && comedo <= 5) patch.comedogenicity = comedo
    else console.warn(`skipping ${rec.inci}: comedogenicity ${comedo} outside 0-5`)
  }
  const fns = rec.identity?.functions
  if (fns?.length) patch.functions = [...new Set(fns.map(slugify))]
  if (patch.comedogenicity !== undefined || patch.functions) patchByKey.set(rec.inci, patch)
}

async function main() {
  const rows = await db
    .select({ id: ingredients.id, key: ingredients.canonicalKey })
    .from(ingredients)

  const keyed = rows.filter((r): r is { id: string; key: string } => r.key !== null)
  const updates: { id: string; patch: Patch }[] = []
  for (const r of keyed) {
    const patch = patchByKey.get(r.key)
    if (patch) updates.push({ id: r.id, patch })
  }

  const withComedo = updates.filter((u) => u.patch.comedogenicity !== undefined)
  const withFunctions = updates.filter((u) => u.patch.functions)
  const dist = new Map<number, number>()
  for (const u of withComedo) {
    const v = u.patch.comedogenicity as number
    dist.set(v, (dist.get(v) ?? 0) + 1)
  }
  const distStr = [...dist.entries()]
    .sort(([a], [b]) => a - b)
    .map(([v, n]) => `${n}x${v}`)
    .join(', ')

  console.log(`ingredients:            ${rows.length} (${keyed.length} keyed)`)
  console.log(`profiles to update:     ${updates.length}`)
  console.log(`comedogenicity matched: ${withComedo.length} (${distStr})`)
  console.log(`functions matched:      ${withFunctions.length}`)

  if (!WRITE) {
    console.log('\n[dry-run] re-run with --write to apply.')
    return
  }

  await withAdminRls(async (tx) => {
    // reset first so a re-run reflects an updated evidence DB (drops stale values)
    await tx.update(ingredientDermoProfiles).set({ comedogenicity: null, functions: [] })
    for (const u of updates) {
      // fillers already own their row; evidence-only ingredients need a fresh one
      await tx
        .insert(ingredientDermoProfiles)
        .values({ ingredientId: u.id, ...u.patch })
        .onConflictDoUpdate({
          target: ingredientDermoProfiles.ingredientId,
          set: u.patch,
        })
    }
  })

  console.log(`\napplied: updated ${updates.length} profiles.`)
}

await main()
process.exit(0)
