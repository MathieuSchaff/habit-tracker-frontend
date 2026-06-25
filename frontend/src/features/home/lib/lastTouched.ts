import type { UserProduct } from '@/lib/queries/user-products'

// Most recently modified collection item — drives the home "reprise" copy.
// updatedAt is ISO 8601 UTC, so a lexical max is a chronological max.
export function lastTouched(list: UserProduct[] | undefined): UserProduct | null {
  if (!list?.length) return null
  return list.reduce((latest, item) => (item.updatedAt > latest.updatedAt ? item : latest))
}
