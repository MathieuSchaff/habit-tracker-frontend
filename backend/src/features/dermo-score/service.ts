import type { SkinConcern, SkinType } from '@aurore/shared'

import { analyzeINCI, cleanInciString, type ProductAssessment, type UserProfile } from 'algo-derm'
import { eq } from 'drizzle-orm'

import { type Database, type DB, db } from '../../db'
import { userDermoProfiles } from '../../db/schema/auth/users'
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

export type DermoScoreOutcome =
  | { ok: true; assessment: ProductAssessment }
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
  return { ok: true, assessment }
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
