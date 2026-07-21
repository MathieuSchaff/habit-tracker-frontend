import { evaluateSeoEligibility, SITE_URL } from '@aurore/shared'

import { isNotNull, sql } from 'drizzle-orm'

import type { DB } from '../../db'
import { articles } from '../../db/schema/blog/articles'
import { ingredients } from '../../db/schema/ingredients/ingredients'
import { products } from '../../db/schema/products/products'
import { normalizeInstant } from '../../utils/dates'

type SitemapEntry = { path: string; lastmod: string | null }

// Marketing + indexable hub pages that are not row-backed. The blog category hubs
// are data-driven (only non-empty ones) and come from getSitemapEntries.
const STATIC_PATHS = ['/', '/about', '/privacy', '/products', '/ingredients', '/blog']

// Slugs are [a-z0-9-] by construction (create paths slugify); this is the belt
// for when a row bypasses that. lastmod is toISOString output, never escaped.
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Public URLs only: catalogue rows accepted by the shared SEO publication rule
// + published articles. lastmod feeds crawlers a recrawl hint; null (static
// pages) omits the tag.
async function getSitemapEntries(db: DB): Promise<SitemapEntry[]> {
  const [prods, ings, arts] = await Promise.all([
    db
      .select({
        slug: products.slug,
        updatedAt: products.updatedAt,
        moderationStatus: products.moderationStatus,
        category: products.category,
        // Keep formula payloads out of the sitemap query; only the publication
        // fact crosses the policy interface. btrim also rejects whitespace-only INCI.
        hasInci: sql<boolean>`nullif(btrim(coalesce(${products.inci}, '')), '') is not null`,
      })
      .from(products),
    db
      .select({
        slug: ingredients.slug,
        updatedAt: ingredients.updatedAt,
        moderationStatus: ingredients.moderationStatus,
      })
      .from(ingredients),
    db
      .select({
        slug: articles.slug,
        category: articles.category,
        updatedAt: articles.updatedAt,
      })
      .from(articles)
      .where(isNotNull(articles.publishedAt)),
  ])

  // One hub entry per category that has at least one published article; lastmod is
  // the freshest article in it. ISO strings compare lexicographically = chronologically.
  const categoryLastmod = new Map<string, string | null>()
  for (const a of arts) {
    const mod = normalizeInstant(a.updatedAt)
    const prev = categoryLastmod.get(a.category)
    if (prev === undefined || (mod && (prev === null || mod > prev))) {
      categoryLastmod.set(a.category, mod)
    }
  }

  return [
    ...prods
      .filter(
        (p) =>
          evaluateSeoEligibility({
            kind: 'product',
            moderationStatus: p.moderationStatus,
            category: p.category,
            hasInci: p.hasInci,
          }).indexable
      )
      .map((p) => ({ path: `/products/${p.slug}`, lastmod: normalizeInstant(p.updatedAt) })),
    ...ings
      .filter(
        (i) =>
          evaluateSeoEligibility({
            kind: 'ingredient',
            moderationStatus: i.moderationStatus,
          }).indexable
      )
      .map((i) => ({
        path: `/ingredients/${i.slug}`,
        lastmod: normalizeInstant(i.updatedAt),
      })),
    ...[...categoryLastmod].map(([category, lastmod]) => ({
      path: `/blog/${category}`,
      lastmod,
    })),
    ...arts.map((a) => ({
      path: `/blog/${a.category}/${a.slug}`,
      lastmod: normalizeInstant(a.updatedAt),
    })),
  ]
}

export async function buildSitemapXml(db: DB): Promise<string> {
  const urls: SitemapEntry[] = [
    ...STATIC_PATHS.map((path) => ({ path, lastmod: null })),
    ...(await getSitemapEntries(db)),
  ]
  const body = urls
    .map(({ path, lastmod }) => {
      const loc = escapeXml(`${SITE_URL}${path}`)
      const mod = lastmod ? `<lastmod>${lastmod}</lastmod>` : ''
      return `<url><loc>${loc}</loc>${mod}</url>`
    })
    .join('')
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`
}
