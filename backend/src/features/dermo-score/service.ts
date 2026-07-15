import type { SkinConcern, SkinType } from '@aurore/shared'

import { analyzeINCI, cleanInciString, type ProductAssessment, type UserProfile } from 'algo-derm'
import { and, eq, inArray } from 'drizzle-orm'

import { type Database, type DB, db } from '../../db'
import { userDermoProfiles } from '../../db/schema/auth/users'
import { ingredients } from '../../db/schema/ingredients/ingredients'
import { products } from '../../db/schema/products/products'
import { mapKindToContext } from '../../lib/algo-derm-product-context'
import { fetchKnownConcentrationsByProduct } from '../../lib/fetch-known-concentrations'
import { ProductError } from '../products/product-error'

const SENSITIVE_SKIN_TYPES: ReadonlyArray<SkinType> = ['peau-sensible']

const ROSACEA_CONCERNS: ReadonlyArray<SkinConcern> = [
  'rosacee',
  'couperose',
  'flushs',
  'anti-rougeurs',
]

const ACNE_CONCERNS: ReadonlyArray<SkinConcern> = [
  'anti-acne',
  'post-acne',
  'pores-dilates',
  'brillance',
]

// algo-derm v1 has only sensitiveSkin / acneProne / rosacea / pregnant axes;
// the other 14 SKIN_CONCERNS map to none and are intentionally dropped.
function mapToAlgoDermProfile(
  skinTypes: ReadonlyArray<SkinType>,
  skinConcerns: ReadonlyArray<SkinConcern>
): UserProfile {
  return {
    sensitiveSkin: skinTypes.some((t) => SENSITIVE_SKIN_TYPES.includes(t)),
    acneProne: skinConcerns.some((c) => ACNE_CONCERNS.includes(c)),
    rosacea: skinConcerns.some((c) => ROSACEA_CONCERNS.includes(c)),
    pregnant: false,
  }
}

type RiskDriver = ProductAssessment['explanation']['topDrivers'][number]
type BenefitDriver = ProductAssessment['explanation']['topBenefitDrivers'][number]

// ProductAssessment with each explanation driver carrying the slug of its
// ingredient page, so the frontend can link labels without a second request.
export type LinkedAssessment = Omit<ProductAssessment, 'explanation'> & {
  explanation: Omit<ProductAssessment['explanation'], 'topDrivers' | 'topBenefitDrivers'> & {
    topDrivers: (RiskDriver & { ingredientSlug: string | null })[]
    topBenefitDrivers: (BenefitDriver & { ingredientSlug: string | null })[]
  }
}

export type DermoScoreOutcome =
  | { ok: true; assessment: LinkedAssessment }
  | { ok: false; reason: 'inci_missing' }

export async function computeProductDermoScore(
  productSlug: string,
  userId: string | null,
  database: Database = db
): Promise<DermoScoreOutcome> {
  const [product] = await database
    .select({
      id: products.id,
      inci: products.inci,
      kind: products.kind,
      category: products.category,
    })
    .from(products)
    .where(eq(products.slug, productSlug))
    .limit(1)

  if (!product) throw new ProductError('product_not_found')

  // Repair scraper-damaged separators/labels/prose before scoring; analyzeINCI
  // splits internally, so a broken INCI silently mis-parsed under the old raw trim.
  const inci = product.inci ? cleanInciString(product.inci) : undefined
  if (!inci) return { ok: false, reason: 'inci_missing' }

  const profile = userId ? await loadAlgoDermProfile(userId, database) : undefined
  const knownConcentrations = (await fetchKnownConcentrationsByProduct([product.id], database)).get(
    product.id
  )
  const context = { ...mapKindToContext(product.kind), knownConcentrations }

  const assessment = analyzeINCI(inci, { profile, context })
  return {
    ok: true,
    assessment: await attachIngredientSlugs(assessment, product.category, database),
  }
}

type LinkRow = { name: string; slug: string; type: string; canonicalKey: string | null }

// Shadow rows (`-hair`, `-dental`) share name and canonical_key with their
// canonical sibling, so name alone cannot break the tie: rank by ingredient
// type closest to the product's category, then slug. Locale pinned for determinism.
function sortPreferred(rows: LinkRow[], category: string): LinkRow[] {
  const preferred =
    category === 'haircare' || category === 'dental'
      ? category
      : category === 'complement'
        ? 'supplement'
        : 'skincare'
  const penalty = (r: LinkRow) => (r.type === preferred ? 0 : 1)
  return [...rows].sort(
    (a, b) =>
      penalty(a) - penalty(b) ||
      a.name.localeCompare(b.name, 'en') ||
      a.slug.localeCompare(b.slug, 'en')
  )
}

// `driver.inci` and `ingredients.canonical_key` come from the same algo-derm
// alias index (evidence.inci), so the join is raw string equality — no
// normalization. Interaction drivers carry a rule id, never an ingredient.
// Exported for tests only.
export async function attachIngredientSlugs(
  assessment: ProductAssessment,
  category: string,
  database: Database
): Promise<LinkedAssessment> {
  const { topDrivers, topBenefitDrivers } = assessment.explanation

  const keys = new Set<string>()
  for (const d of topDrivers) {
    if (d.source !== 'interaction' && d.inci) keys.add(d.inci)
  }
  for (const d of topBenefitDrivers) {
    if (d.inci) keys.add(d.inci)
  }

  const rows =
    keys.size > 0
      ? await database
          .select({
            name: ingredients.name,
            slug: ingredients.slug,
            type: ingredients.type,
            canonicalKey: ingredients.canonicalKey,
          })
          .from(ingredients)
          .where(
            and(
              inArray(ingredients.canonicalKey, [...keys]),
              eq(ingredients.moderationStatus, 'visible')
            )
          )
      : []

  const slugByKey = new Map<string, string>()
  for (const row of sortPreferred(rows, category)) {
    if (row.canonicalKey && !slugByKey.has(row.canonicalKey)) {
      slugByKey.set(row.canonicalKey, row.slug)
    }
  }

  const resolve = (inciKey: string | undefined) => (inciKey && slugByKey.get(inciKey)) || null
  return {
    ...assessment,
    explanation: {
      ...assessment.explanation,
      topDrivers: topDrivers.map((d) => ({
        ...d,
        ingredientSlug: d.source === 'interaction' ? null : resolve(d.inci),
      })),
      topBenefitDrivers: topBenefitDrivers.map((d) => ({ ...d, ingredientSlug: resolve(d.inci) })),
    },
  }
}

export async function loadAlgoDermProfile(
  userId: string,
  database: DB
): Promise<UserProfile | undefined> {
  const [row] = await database
    .select({
      skinTypes: userDermoProfiles.skinTypes,
      skinConcerns: userDermoProfiles.skinConcerns,
    })
    .from(userDermoProfiles)
    .where(eq(userDermoProfiles.userId, userId))
    .limit(1)

  if (!row) return undefined
  return mapToAlgoDermProfile(row.skinTypes ?? [], row.skinConcerns ?? [])
}
