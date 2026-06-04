import type { ProductKind } from '@aurore/shared'
import { SKINCARE_PRODUCT_TAG_SLUGS, type SkincareProductTagSlug } from '@aurore/shared'

const S = SKINCARE_PRODUCT_TAG_SLUGS

// Recall recovery for the `protection` concern (re-emits an algo-derm slug,
// ADR-0004). The algo-derm pass keys on antioxidant INCI and tagged only
// ~25/399 sunscreens; it both over-tags antioxidant serums and misses real
// UV protection. This pass closes the recall hole with a mechanical rule:
//   - kind === 'sunscreen'      → a sunscreen protects from UV by definition.
//   - SPF/FPS stated in name/desc → any stated index protects physically,
//     so tinted / day creams / makeup with SPF count (worksheet rule D).
// Post-exposure kinds (after-sun, self-tanner) are excluded because they are
// not `sunscreen`; without a stated SPF they stay absent (worksheet rule E).

// SPF/FPS/IP index + "indice (de) protection", tolerating common separators.
// Matches: `SPF 50`, `SPF-50`, `spf.30`, `IP50`, `FPS30`, `indice de protection`.
const SPF_CLAIM_RE = /\b(spf|fps|ip)[\s:.-]*\d|\bindice\s+(?:de\s+)?protection\b/i

export function detectProtection(
  kind: ProductKind,
  name: string | null | undefined,
  description: string | null | undefined
): SkincareProductTagSlug[] {
  if (kind === 'sunscreen') return [S.PROTECTION]
  if (SPF_CLAIM_RE.test(name ?? '') || SPF_CLAIM_RE.test(description ?? '')) return [S.PROTECTION]
  return []
}
