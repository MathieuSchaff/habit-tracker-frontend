import type { ProductFormulaPreviewInput } from '@aurore/shared'

import { normalize, splitINCI, stripPreamble } from 'algo-derm'
import { buildAliasIndex, lookupIngredient, MERGED_EVIDENCE_DB } from 'algo-derm/engine'
import { inArray } from 'drizzle-orm'

import type { DB } from '../../db/index'
import { ingredients } from '../../db/schema/ingredients/ingredients'
import { detectAllAutoTags } from '../auto-tagging'
import { AUTO_TAG_ELIGIBLE_CATEGORIES } from '../auto-tagging/orchestrator'

// Built once on first call — `MERGED_EVIDENCE_DB` is immutable at runtime.
let aliasIndex: ReturnType<typeof buildAliasIndex> | null = null
function getAliasIndex() {
  if (!aliasIndex) aliasIndex = buildAliasIndex(MERGED_EVIDENCE_DB)
  return aliasIndex
}

const AUTO_TAG_ELIGIBLE_SET: ReadonlySet<string> = new Set(AUTO_TAG_ELIGIBLE_CATEGORIES)

export type FormulaPreviewToken = {
  raw: string
  normalized: string
  canonicalKey: string | null
  ingredient: { id: string; name: string; slug: string } | null
}

export type FormulaPreviewResult = {
  tokens: FormulaPreviewToken[]
  suggestedTags: { tagSlug: string; relevance: 'primary' | 'secondary' | 'avoid'; source: string }[]
  autoTagEligible: boolean
}

type IngredientRow = { id: string; name: string; slug: string; type: string }

// `-hair` shadow rows share name and canonical_key with their canonical sibling;
// outside haircare they must lose the tie. Locale pinned for determinism.
function sortPreferred(rows: IngredientRow[], category: string): IngredientRow[] {
  const hairPenalty = (r: IngredientRow) =>
    category !== 'haircare' && r.type === 'haircare' ? 1 : 0
  return [...rows].sort(
    (a, b) => hairPenalty(a) - hairPenalty(b) || a.name.localeCompare(b.name, 'en')
  )
}

export async function previewProductFormula(
  input: ProductFormulaPreviewInput,
  db: DB
): Promise<FormulaPreviewResult> {
  const idx = getAliasIndex()

  const rawTokens = splitINCI(stripPreamble(input.inci))

  // Mirror backfill-canonical-key.ts: pass raw token as first arg to lookupIngredient.
  const tokenMeta = rawTokens.map((raw) => ({
    raw,
    normalized: normalize(raw),
    canonicalKey: lookupIngredient(raw, idx)?.inci ?? null,
  }))

  const ingredientColumns = {
    id: ingredients.id,
    name: ingredients.name,
    slug: ingredients.slug,
    type: ingredients.type,
  }

  const distinctKeys = [...new Set(tokenMeta.map((t) => t.canonicalKey).filter((k) => k !== null))]
  const keyRows =
    distinctKeys.length > 0
      ? await db
          .select({ ...ingredientColumns, canonicalKey: ingredients.canonicalKey })
          .from(ingredients)
          .where(inArray(ingredients.canonicalKey, distinctKeys))
      : []

  const byKey = new Map<string, IngredientRow>()
  for (const row of sortPreferred(keyRows, input.category)) {
    const key = (row as (typeof keyRows)[number]).canonicalKey
    if (key && !byKey.has(key)) byKey.set(key, row)
  }

  // Fallback for tokens without a usable canonical key: accent-folded name match.
  // Postgres lower() keeps accents while normalize() strips them, so the fold must
  // happen in JS — the table is small enough (~700 rows) for a full lightweight scan.
  const needFallback = tokenMeta.some((t) => t.canonicalKey === null || !byKey.has(t.canonicalKey))
  const allRows = needFallback ? await db.select(ingredientColumns).from(ingredients) : []

  // FR display names embed INCI variants in parentheses ("Tocophérol (Tocopherol /
  // Vitamine E)"); index the folded base name plus each parenthesised variant.
  const byNorm = new Map<string, IngredientRow>()
  for (const row of sortPreferred(allRows, input.category)) {
    const variants = [normalize(row.name)]
    for (const m of row.name.matchAll(/\(([^)]*)\)/g)) {
      for (const part of m[1].split('/')) variants.push(normalize(part))
    }
    for (const v of variants) {
      if (v && !byNorm.has(v)) byNorm.set(v, row)
    }
  }

  // INCI order preserved, duplicates kept — token count must match the pasted list.
  const tokens: FormulaPreviewToken[] = tokenMeta.map(({ raw, normalized, canonicalKey }) => {
    const keyRow = canonicalKey ? byKey.get(canonicalKey) : undefined
    const match = keyRow ?? (normalized ? byNorm.get(normalized) : undefined)
    return {
      raw,
      normalized,
      canonicalKey,
      ingredient: match ? { id: match.id, name: match.name, slug: match.slug } : null,
    }
  })

  // detectAllAutoTags is pure / DB-free. Field mapping mirrors AUTOTAG_INPUT_FIELDS in service.ts.
  const autoTagEligible = AUTO_TAG_ELIGIBLE_SET.has(input.category)
  const suggestedTags = autoTagEligible
    ? detectAllAutoTags({
        inci: input.inci,
        kind: input.kind as never,
        category: input.category,
        brand: input.brand ?? null,
        texture: input.texture ?? null,
        name: input.name ?? null,
        description: input.description ?? null,
      })
    : []

  return { tokens, suggestedTags, autoTagEligible }
}
