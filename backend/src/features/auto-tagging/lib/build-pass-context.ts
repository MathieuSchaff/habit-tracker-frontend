// Builds a `PassContext` once per product (ADR-0001).
//
// §D.3 hoist: split INCI + analyze once, shared across all passes.
//
// Marketing preamble is stripped before splitINCI so position-rules
// (top-8 butter/wax for texture-riche, etc.) don't fire on prose chunks
// (~589 seed products with French/Korean brand prose ahead of the INCI list).

import { analyzeINCI, normalize, splitINCI } from 'algo-derm'

import { mapKindToContext } from '../../../lib/algo-derm-product-context'
import type { OrchestratorInput, OrchestratorOptions } from '../orchestrator'
import type { DetectAutoTagsOptions } from '../passes/auto-tag-detection'
import { stripMarketingPreamble } from './ingredient-resolver'
import type { PassContext } from './pass-types'

export function buildPassContext(
  product: OrchestratorInput,
  options: OrchestratorOptions
): PassContext {
  const hasInci = !!product.inci?.trim()
  const cleanedInci = hasInci ? stripMarketingPreamble(product.inci ?? '') : ''
  const ingredients = hasInci ? splitINCI(cleanedInci) : []
  const normalizedIngredients = hasInci ? ingredients.map(normalize) : []
  const assessment = hasInci
    ? analyzeINCI(cleanedInci, {
        context: {
          ...mapKindToContext(product.kind),
          knownConcentrations: product.knownConcentrations,
        },
      })
    : undefined

  const detectAutoTagsOptions: DetectAutoTagsOptions = {
    ...(options.confOverride !== undefined ? { confOverride: options.confOverride } : {}),
    ...(options.includeDropped !== undefined ? { includeDropped: options.includeDropped } : {}),
    ...(options.coverageMinOverride !== undefined
      ? { coverageMinOverride: options.coverageMinOverride }
      : {}),
    ...(options.disableFloors !== undefined ? { disableFloors: options.disableFloors } : {}),
  }

  return {
    inci: product.inci,
    kind: product.kind,
    category: product.category,
    brand: product.brand ?? null,
    texture: product.texture ?? null,
    name: product.name ?? null,
    description: product.description ?? null,
    percentClaims: product.percentClaims,
    knownConcentrations: product.knownConcentrations,
    brandCertifications: options.brandCertifications,
    hasInci,
    cleanedInci,
    ingredients,
    normalizedIngredients,
    assessment,
    detectAutoTagsOptions,
  }
}
