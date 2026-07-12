// Input-assembly seam for detectAllAutoTags. Before this module every caller
// hand-built the OrchestratorInput object; the fields being optional, three
// callers had silently dropped one (seed texture, preview/bench brand certs).
// `OrchestratorProductFields` keys are required, so omitting a field is a
// compile error instead of a silent detection gap — a caller must say `null`.

import type { ProductCategory, ProductKind, ProductTexture } from '@aurore/shared'

import { detectAllAutoTags } from '../orchestrator'
import type { BrandCertificationLookup } from '../passes/brand-cert-detection'
import type { PercentClaimEvidence } from '../passes/percent-claim-detection'
import type { OrchestratorInput, OrchestratorOptions } from './orchestrator-types'
import type { AutoTagPair } from './pass-types'
import { type ResolvedTagRow, resolveTagRows } from './resolve-tag-rows'

export interface OrchestratorProductFields {
  inci: string | null | undefined
  kind: ProductKind
  category: ProductCategory
  brand: string | null
  texture: ProductTexture | null
  name: string | null
  description: string | null
}

export interface OrchestratorInputExtras {
  percentClaims?: readonly PercentClaimEvidence[]
  knownConcentrations?: Record<string, number>
}

export function buildOrchestratorInput(
  product: OrchestratorProductFields,
  extras: OrchestratorInputExtras = {}
): OrchestratorInput {
  return {
    inci: product.inci,
    kind: product.kind,
    category: product.category,
    brand: product.brand,
    texture: product.texture,
    name: product.name,
    description: product.description,
    percentClaims: extras.percentClaims ?? [],
    knownConcentrations: extras.knownConcentrations,
  }
}

// Everything a DB-backed caller needs beyond the product row itself.
// Loaded by lib/fetch-auto-tag-bundle.ts.
export interface AutoTagFetchBundle {
  brandCertifications: BrandCertificationLookup
  tagSlugToInfo: Map<string, { id: string; tagType: string }>
  percentClaimsByProduct: Map<string, PercentClaimEvidence[]>
  knownConcentrationsByProduct: Map<string, Record<string, number>>
}

export interface AutoTagProductRow extends OrchestratorProductFields {
  id: string
}

export interface ComputedTagRows {
  pairs: AutoTagPair[]
  rows: ResolvedTagRow[]
  withheld: boolean
}

// Detection kernel for DB-backed callers: build input → detect → persist
// filter. `pairs` is the raw orchestrator emission (audit/bench and the
// source-only rewrite read it); `rows` is what may reach product_tag_links —
// eczema withholding + domain filter applied, so a persisting consumer cannot
// forget the filter by calling detectAllAutoTags directly.
export function computeTagRowsForProduct(
  product: AutoTagProductRow,
  bundle: AutoTagFetchBundle,
  options: Omit<OrchestratorOptions, 'brandCertifications'> = {}
): ComputedTagRows {
  const pairs = detectAllAutoTags(
    buildOrchestratorInput(product, {
      percentClaims: bundle.percentClaimsByProduct.get(product.id) ?? [],
      knownConcentrations: bundle.knownConcentrationsByProduct.get(product.id),
    }),
    { ...options, brandCertifications: bundle.brandCertifications }
  )
  const { rows, withheld } = resolveTagRows(pairs, product, bundle.tagSlugToInfo)
  return { pairs, rows, withheld }
}
