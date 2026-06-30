import { Hono } from 'hono'

import type { AppEnv } from '../../app-env'
import { globalErrorHandler } from '../../utils/errors/error-handler'
import { testDb } from '../db.test.config'
import { JWT_SECRET, REFRESH_SECRET } from '../helpers/secrets'

export async function createTestApp() {
  const app = new Hono<AppEnv>()

  app.onError(globalErrorHandler)

  // Dynamically import routes to avoid circular dependencies during test initialization
  const { jwtAuthRoutes } = await import('../../features/auth/routes')
  const { healthRoute, readyRoute } = await import('../../features/health/routes')
  const { ingredientTagRoutes } = await import('../../features/ingredients/ingredient-tags/routes')
  const { ingredientRoutes } = await import('../../features/ingredients/routes')
  const { productsFeature } = await import('../../features/products')
  const { productComparisonRoutes } = await import('../../features/product-comparisons/routes')
  const { productTagDefRoutes } = await import('../../features/product-tags/routes')
  const { ingredientTagDefRoutes } = await import('../../features/ingredient-tags/routes')
  const { profileRoute } = await import('../../features/profile/routes')
  const { publicProfileRoutes } = await import('../../features/profile/public-routes')
  const { socialRoutes } = await import('../../features/social/routes')
  const { socialPostsRoutes } = await import('../../features/social/posts.routes')
  const { socialReactionsRoutes } = await import('../../features/social/reactions.routes')
  const { taskRoutes } = await import('../../features/tasks/routes')
  const { userProductRoutes } = await import('../../features/user-products/routes')
  const { collectionRoutes } = await import('../../features/collection/routes')
  const { meRoutes } = await import('../../features/catalog-submissions/routes')
  const { errorsRoute } = await import('../../features/errors/routes')
  const { ingredientDiscussionRoutes } = await import(
    '../../features/discussions/ingredient-discussion-routes'
  )
  const { articleRoutes } = await import('../../features/blog/routes')
  const { uploadsRoutes } = await import('../../features/uploads/routes')
  const { adminBansRoutes } = await import('../../features/admin/bans.routes')
  const { adminErrorsRoutes } = await import('../../features/admin/errors.routes')
  const { adminModerationRoutes } = await import('../../features/admin/moderation.routes')
  const { adminReportsRoutes } = await import('../../features/admin/reports.routes')
  const { adminRoleRequestsRoutes } = await import('../../features/admin/role-requests.routes')
  const { adminSecurityEventsRoutes } = await import('../../features/admin/security-events.routes')
  const { adminSuggestedEditsRoutes } = await import('../../features/admin/suggested-edits.routes')
  const { reportsRoutes } = await import('../../features/reports/routes')
  const { roleRequestsRoutes } = await import('../../features/role-requests/routes')
  const { suggestedEditsRoutes } = await import('../../features/suggested-edits/routes')

  app.use('*', async (c, next) => {
    c.set('db', testDb)
    c.set('env', 'development')
    c.set('jwtSecret', JWT_SECRET)
    c.set('refreshSecret', REFRESH_SECRET)
    c.set('frontendUrl', 'http://localhost:5173')
    await next()
  })

  // Mirror production mounting (index.ts): every router under /api, and products
  // via the productsFeature composite — so a prefix/composition regression cannot
  // pass here. Chain reassigned to preserve route types for testClient RPC inference.
  const routedApp = app
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
    .route('/api/tasks', taskRoutes)
    .route('/api/user-products', userProductRoutes)
    .route('/api/collection', collectionRoutes)
    .route('/api/me', meRoutes)
    .route('/api/uploads', uploadsRoutes)
    .route('/api/errors', errorsRoute)
    .route('/api/articles', articleRoutes)
    .route('/api/admin', adminBansRoutes)
    .route('/api/admin/moderation', adminModerationRoutes)
    .route('/api/admin/reports', adminReportsRoutes)
    .route('/api/admin/errors', adminErrorsRoutes)
    .route('/api/admin/security-events', adminSecurityEventsRoutes)
    .route('/api/reports', reportsRoutes)
    .route('/api/admin/role-requests', adminRoleRequestsRoutes)
    .route('/api/role-requests', roleRequestsRoutes)
    .route('/api/admin/suggested-edits', adminSuggestedEditsRoutes)
    .route('/api/suggested-edits', suggestedEditsRoutes)

  return routedApp
}

export type TestAppType = Awaited<ReturnType<typeof createTestApp>>
