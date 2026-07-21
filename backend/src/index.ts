const port = Number(process.env.PORT ?? 3000)

import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'

import type { AppEnv } from './app-env'
import { env } from './config/env'
import { db } from './db/index'
import { adminBansRoutes } from './features/admin/bans.routes'
import { adminModerationRoutes } from './features/admin/moderation.routes'
import { adminReportsRoutes } from './features/admin/reports.routes'
import { adminRoleRequestsRoutes } from './features/admin/role-requests.routes'
import { adminSecurityEventsRoutes } from './features/admin/security-events.routes'
import { adminSuggestedEditsRoutes } from './features/admin/suggested-edits.routes'
import { jwtAuthRoutes } from './features/auth'
import { articleRoutes } from './features/blog'
import { meRoutes } from './features/catalog-submissions/routes'
import { collectionRoutes } from './features/collection/routes'
import { ingredientDiscussionRoutes } from './features/discussions/ingredient-discussion-routes'
import { healthRoute, readyRoute } from './features/health/routes'
import { ingredientTagDefRoutes } from './features/ingredient-tags/routes'
import { ingredientTagRoutes } from './features/ingredients/ingredient-tags/routes'
import { ingredientRoutes } from './features/ingredients/routes'
import { productComparisonRoutes } from './features/product-comparisons'
import { productTagDefRoutes } from './features/product-tags/routes'
import { productsFeature } from './features/products'
import { profileRoute, publicProfileRoutes } from './features/profile'
import { reportsRoutes } from './features/reports/routes'
import { roleRequestsRoutes } from './features/role-requests/routes'
import { sitemapRoutes } from './features/sitemap'
import { socialPostsRoutes } from './features/social/posts.routes'
import { socialReactionsRoutes } from './features/social/reactions.routes'
import { socialRoutes } from './features/social/routes'
import { suggestedEditsRoutes } from './features/suggested-edits/routes'
import { uploadsRoutes } from './features/uploads'
import { userProductRoutes } from './features/user-products'
import { logger } from './lib/logger'
import { otelTracingMiddleware } from './lib/observability/hono-tracing'
import { globalErrorHandler } from './utils/errors/error-handler'
import { globalRateLimiterFunc } from './utils/rateLimiter'

logger.info(`API listening on ${port}`)
const app = new Hono<AppEnv>()

app.onError(globalErrorHandler)

app.use(secureHeaders())
app.use(bodyLimit({ maxSize: 1024 * 1024 }))
app.use(
  '*',
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 600,
  })
)
app.use('*', async (c, next) => {
  c.set('db', db)
  c.set('env', Bun.env.NODE_ENV === 'production' ? 'production' : 'development')
  c.set('jwtSecret', env.JWT_SECRET)
  c.set('refreshSecret', env.REFRESH_SECRET)
  c.set('frontendUrl', env.FRONTEND_URL)
  await next()
})

app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  logger.info({
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    ms: Date.now() - start,
  })
})

app.use('*', otelTracingMiddleware)
app.use('*', globalRateLimiterFunc)

const routes = app
  .route('/api/auth', jwtAuthRoutes)
  .route('/api/health', healthRoute)
  .route('/api/ready', readyRoute)
  .route('/api/profile', profileRoute)
  .route('/api/profiles', publicProfileRoutes)
  .route('/api/social', socialRoutes)
  .route('/api/social/posts', socialPostsRoutes)
  .route('/api/social/reactions', socialReactionsRoutes)
  .route('/api', productsFeature)
  .route('/api/product-comparisons', productComparisonRoutes)
  .route('/api/ingredients', ingredientRoutes)
  .route('/api/ingredients', ingredientTagRoutes)
  .route('/api/ingredients', ingredientDiscussionRoutes)
  .route('/api/product-tags', productTagDefRoutes)
  .route('/api/ingredient-tags', ingredientTagDefRoutes)
  .route('/api/user-products', userProductRoutes)
  .route('/api/collection', collectionRoutes)
  .route('/api/me', meRoutes)
  .route('/api/uploads', uploadsRoutes)
  .route('/api/articles', articleRoutes)
  .route('/api/sitemap.xml', sitemapRoutes)
  .route('/api/admin', adminBansRoutes)
  .route('/api/admin/moderation', adminModerationRoutes)
  .route('/api/admin/reports', adminReportsRoutes)
  .route('/api/admin/security-events', adminSecurityEventsRoutes)
  .route('/api/reports', reportsRoutes)
  .route('/api/admin/role-requests', adminRoleRequestsRoutes)
  .route('/api/role-requests', roleRequestsRoutes)
  .route('/api/admin/suggested-edits', adminSuggestedEditsRoutes)
  .route('/api/suggested-edits', suggestedEditsRoutes)

// Dev-only API reference. Kept off `routes` (AppType) so it never leaks into
// the RPC client type; the spec is generated at build time by `just docs`.
if (Bun.env.NODE_ENV !== 'production') {
  const specPath = './openapi/openapi.json'
  app.get('/api/openapi.json', async (c) => {
    const file = Bun.file(specPath)
    if (!(await file.exists())) return c.json({ error: 'spec_not_generated' }, 404)
    return new Response(file, { headers: { 'content-type': 'application/json' } })
  })
  app.get('/api/docs', (c) =>
    c.html(
      `<!doctype html><html><head><meta charset="utf-8"><title>Aurore API</title></head>
<body><script id="api-reference" data-url="/api/openapi.json"></script>
<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script></body></html>`
    )
  )
}

app.notFound((c) => c.json({ success: false, error: 'not_found' }, 404))

export type AppType = typeof routes

const server = Bun.serve({ port, fetch: app.fetch })

// Drain in-flight requests, then release DB connections on shutdown.
// 8s hard cap stays under Docker's 10s SIGTERM→SIGKILL window.
let shuttingDown = false
const shutdown = async (signal: string) => {
  if (shuttingDown) return
  shuttingDown = true
  logger.info(`${signal} received, shutting down`)
  const forceExit = setTimeout(() => process.exit(1), 8000)
  forceExit.unref()
  await server.stop()
  await db.$client.close()
  clearTimeout(forceExit)
  process.exit(0)
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
