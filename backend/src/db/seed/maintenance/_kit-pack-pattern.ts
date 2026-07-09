// Shared between scan-db-duplicates.ts (report) and hide-kit-pack-products.ts (apply).
// Matches slug markers for bundles: gift coffrets, kits, and bulk "lot de N" packs.
export const KIT_PACK_RE =
  /-(?:famille-et|et-eco-recharge|kit|coffret|duo-pack|gift-set|trio-set|lot-de-\d+)(?:-|$)/
