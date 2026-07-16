// Single source for auto-tag category eligibility. Lives in lib/ (not
// orchestrator.ts) so passes can import it without creating an import cycle
// through the registry. Haircare, dental, supplements carry no INCI-derived
// signal yet.

// Tuple is the source of truth for typed `inArray` queries; the predicate is
// the runtime check.
export const AUTO_TAG_ELIGIBLE_CATEGORIES = ['skincare', 'solaire', 'bodycare'] as const

const AUTO_TAG_ELIGIBLE_SET: ReadonlySet<string> = new Set(AUTO_TAG_ELIGIBLE_CATEGORIES)

export function isAutoTagEligibleCategory(category: string): boolean {
  return AUTO_TAG_ELIGIBLE_SET.has(category)
}
