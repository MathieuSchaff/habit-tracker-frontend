// Batch-loads the AutoTagFetchBundle (brand certs, tag defs, percent claims,
// known concentrations) for a set of products. One loader for intake and the
// batch runners so the fetch set cannot drift per caller — brand certs used to
// be fetched four times over, with two callers silently missing inputs.
//
// Reads are sequential, not Promise.all: when `database` is a transaction they
// share one connection, and Bun's SQL pipelines concurrent statements then
// misroutes their result sets — an empty tag-defs read silently drops every
// tag while the intake DELETE still wipes existing rows. Reconcile passes a tx
// (withAdminRls); intake uses the pool.

import { type DB, db } from '../../../db'
import { brandCertifications, productTagTypes } from '../../../db/schema'
import { fetchKnownConcentrationsByProduct } from '../../../lib/fetch-known-concentrations'
import { fetchPercentClaimsByProduct } from '../../../lib/fetch-percent-claims'
import type { AutoTagFetchBundle } from './orchestrator-input'

export async function loadAutoTagFetchBundle(
  productIds: readonly string[],
  database: DB = db
): Promise<AutoTagFetchBundle> {
  const certRows = await database.select().from(brandCertifications)
  const percentClaimsByProduct = await fetchPercentClaimsByProduct(productIds, database)
  const knownConcentrationsByProduct = await fetchKnownConcentrationsByProduct(productIds, database)
  const tagDefs = await database
    .select({
      id: productTagTypes.id,
      slug: productTagTypes.slug,
      tagType: productTagTypes.tagType,
    })
    .from(productTagTypes)

  return {
    brandCertifications: new Map(certRows.map((r) => [r.brandNormalized, r])),
    tagSlugToInfo: new Map(tagDefs.map((t) => [t.slug, { id: t.id, tagType: t.tagType }])),
    percentClaimsByProduct,
    knownConcentrationsByProduct,
  }
}
