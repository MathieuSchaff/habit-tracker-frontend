import { SITE_URL } from '@aurore/shared'

import { getCspNonce } from './csp/nonce'

export const INDEX_ROBOTS = 'index, follow'
export const NOINDEX_ROBOTS = 'noindex, follow'

export function canonicalUrl(path: string): string {
  return `${SITE_URL}${path}`
}

// Meta descriptions cap ~160 chars; trim at a word boundary. Collapse newlines/
// tabs first so an excerpt's raw whitespace never leaks into og:description or JSON-LD.
export function clampDesc(s: string, max = 160): string {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length <= max ? t : `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}

type SeoHeadInput = {
  path: string
  title?: string
  description?: string
  // og:title/og:description are opt-in, never derived from title/description:
  // hubs deliberately inherit the root's generic OG pair.
  ogTitle?: string
  ogDescription?: string
  ogType?: string
  image?: string | null
  publishedTime?: string | null
  robots?: string
  jsonLd?: Record<string, unknown>
}

// One shape for every route head(): stable tag order across pages, CSP nonce on
// JSON-LD in a single place. Structured data is dropped on noindex pages
// (rich-result markup on a page crawlers must not index is pure liability).
export function seoHead(input: SeoHeadInput) {
  const { path, title, description, ogTitle, ogDescription, ogType, image, publishedTime, jsonLd } =
    input
  const robots = input.robots ?? INDEX_ROBOTS
  const url = canonicalUrl(path)
  return {
    meta: [
      ...(title ? [{ title }] : []),
      { name: 'robots', content: robots },
      ...(description ? [{ name: 'description', content: description }] : []),
      ...(ogTitle ? [{ property: 'og:title', content: ogTitle }] : []),
      ...(ogDescription ? [{ property: 'og:description', content: ogDescription }] : []),
      ...(ogType ? [{ property: 'og:type', content: ogType }] : []),
      { property: 'og:url', content: url },
      // With a real image, upgrade the inherited root twitter:card=summary to the large card.
      ...(image
        ? [
            { property: 'og:image', content: image },
            { name: 'twitter:card', content: 'summary_large_image' },
          ]
        : []),
      ...(publishedTime ? [{ property: 'article:published_time', content: publishedTime }] : []),
    ],
    links: [{ rel: 'canonical', href: url }],
    ...(jsonLd && !robots.includes('noindex')
      ? {
          scripts: [
            {
              type: 'application/ld+json',
              // Nonce keeps the inline block within the strict CSP (script-src 'self' 'nonce-…').
              nonce: getCspNonce(),
              children: JSON.stringify(jsonLd),
            },
          ],
        }
      : {}),
  }
}
