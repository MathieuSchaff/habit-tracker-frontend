// Shared helpers for the auto-tagging test suite (pure, no DB — DB fixtures
// live in db-helpers.ts so detector tests don't pull the pool transitively).

import type { ProductKind, ProductTexture } from '@aurore/shared'

import { buildPassContext } from '../lib/build-pass-context'
import type { PassContext } from '../lib/pass-types'

// Delegates to the production context builder so passes are tested through the
// same seam the orchestrator uses (no drift between test and prod context).
export function makePassContext(input: {
  kind: ProductKind
  category: string
  inci?: string | null
  brand?: string | null
  name?: string | null
  description?: string | null
  texture?: ProductTexture | null
  brandCertifications?: PassContext['brandCertifications']
  percentClaims?: PassContext['percentClaims']
}): PassContext {
  return buildPassContext(
    {
      inci: input.inci ?? null,
      kind: input.kind,
      category: input.category,
      brand: input.brand,
      name: input.name,
      description: input.description,
      texture: input.texture,
      percentClaims: input.percentClaims,
    },
    { brandCertifications: input.brandCertifications }
  )
}

// N inert `FillerK` tokens, to push a real ingredient past a position cap.
export function fillerIngredients(n: number): string {
  return Array.from({ length: n }, (_, i) => `Filler${i + 1}`).join(', ')
}
