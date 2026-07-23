// Batch-loads the AutoTagFetchBundle (brand certs, tag defs, percent claims,
// known concentrations) for a set of products. One loader for intake and the
// batch runners so the fetch set cannot drift per caller — brand certs used to
// be fetched four times over, with two callers silently missing inputs.
//
// Reads stay sequential as belt-and-suspenders. The bun-sql driver now
// serializes statements on a single tx connection (verified: 0/300 misroute,
// no overlap), so Promise.all would be safe today. But a Bun/driver downgrade
// could reintroduce the concurrent-tx misroute, where a misrouted empty
// tag-defs read drops every tag while the intake DELETE still wipes existing
// rows. Reconcile passes a tx (withAdminRls); intake uses the pool.

import { type DB, db } from '../../../db'
import { brandCertifications, products, productTagTypes } from '../../../db/schema'
import { fetchKnownConcentrationsByProduct } from '../../../lib/fetch-known-concentrations'
import { fetchPercentClaimsByProduct } from '../../../lib/fetch-percent-claims'
import type { AutoTagFetchBundle } from './orchestrator-input'

// Drizzle column set matching `OrchestratorProductFields` — the one select
// shape every DB-backed caller spreads (`{ id: products.id, ...COLUMNS }`), so
// adding an orchestrator input field is one edit, not one per call site.
export const ORCHESTRATOR_PRODUCT_COLUMNS = {
  name: products.name,
  description: products.description,
  brand: products.brand,
  kind: products.kind,
  inci: products.inci,
  category: products.category,
  texture: products.texture,
}

// Shared with the formula preview so its resolveTagRows input cannot drift
// from the tag-def shape the writers persist with.
export async function loadTagSlugToInfo(
  database: DB = db
): Promise<AutoTagFetchBundle['tagSlugToInfo']> {
  const tagDefs = await database
    .select({
      id: productTagTypes.id,
      slug: productTagTypes.slug,
      tagType: productTagTypes.tagType,
    })
    .from(productTagTypes)
  return new Map(tagDefs.map((t) => [t.slug, { id: t.id, tagType: t.tagType }]))
}

export async function loadAutoTagFetchBundle(
  productIds: readonly string[],
  database: DB = db
): Promise<AutoTagFetchBundle> {
  const certRows = await database.select().from(brandCertifications)
  const percentClaimsByProduct = await fetchPercentClaimsByProduct(productIds, database)
  const knownConcentrationsByProduct = await fetchKnownConcentrationsByProduct(productIds, database)
  const tagSlugToInfo = await loadTagSlugToInfo(database)

  return {
    brandCertifications: new Map(certRows.map((r) => [r.brandNormalized, r])),
    tagSlugToInfo,
    percentClaimsByProduct,
    knownConcentrationsByProduct,
  }
}
