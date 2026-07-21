import { Hono } from 'hono'

import type { AppEnv } from '../../app-env'
import { buildSitemapXml } from './service'

const sitemapApp = new Hono<AppEnv>().get('/', async (c) => {
  return c.body(await buildSitemapXml(c.get('db')), 200, {
    'Content-Type': 'application/xml; charset=utf-8',
    // Sitemap changes at most when the catalogue/blog does; a few minutes of
    // caching keeps a crawler burst from running the three queries per hit.
    'Cache-Control': 'public, max-age=600, s-maxage=600',
  })
})

export const sitemapRoutes = sitemapApp
