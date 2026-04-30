import { analyzeINCI, type ProductAssessment, type UserProfile } from 'algo-derm'
import { eq } from 'drizzle-orm'

import { type Database, db } from '../../db'
import { userDermoProfiles } from '../../db/schema/auth/users'
import { products } from '../../db/schema/products/products'
import { ProductError } from '../products/product-error'
import { mapKindToContext, mapToAlgoDermProfile } from './profile-mapping'

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
      inci: products.inci,
      kind: products.kind,
    })
    .from(products)
    .where(eq(products.slug, productSlug))
    .limit(1)

  if (!product) throw new ProductError('product_not_found')

  const inci = product.inci?.trim()
  if (!inci) return { ok: false, reason: 'inci_missing' }

  const profile = userId ? await loadAlgoDermProfile(userId, database) : undefined
  const context = mapKindToContext(product.kind)

  const assessment = analyzeINCI(inci, { profile, context })
  return { ok: true, assessment }
}

async function loadAlgoDermProfile(
  userId: string,
  database: Database
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
