// Shared between scan-db-duplicates.ts (report) and hide-kit-pack-products.ts (apply).
// Matches slug markers for bundles: gift coffrets, kits, and bulk "lot de N" packs.
export const KIT_PACK_RE =
  /-(?:famille-et|et-eco-recharge|kit|coffret|duo-pack|gift-set|trio-set|lot-de-\d+)(?:-|$)/

// Sample / travel / mini markers, tested against both slug and name (samples are
// often flagged in the display name only, e.g. "Repair Day Cream 2ml").
// The tiny-ml branch's lookbehind rejects slugified decimals ("7-5ml" = 7.5ml),
// and word-boundary anchors keep "mini"/"2ml" from matching "20ml" or brand names.
const SAMPLE_RE =
  /(?:chantillon|sample|tester|sachet|cadeau|gift|travel|d[eé]couverte)|(?:^|[-\s])mini(?:$|[-\s])|(?:^|[-\s])(?<![\d][-.,])[1-5]\s?-?ml(?:$|[-\s])/i

// Real products that carry a sample-like word: mini pill counts, mini brush heads,
// multipacks of small units (e.g. "10 x 2ml" ampoule boxes), and protein/collagen
// powders whose retail format is a sachet (30g single-serve or a box of sachets).
const SAMPLE_FALSE_POSITIVE_RE = /comprim|brossette|protein|whey|collag|\d\s*-?\s*x\s*-?\s*\d/i

export function isBundleOrSample(slug: string, name: string): boolean {
  if (SAMPLE_FALSE_POSITIVE_RE.test(slug) || SAMPLE_FALSE_POSITIVE_RE.test(name)) return false
  if (KIT_PACK_RE.test(slug)) return true
  return SAMPLE_RE.test(slug) || SAMPLE_RE.test(name)
}
