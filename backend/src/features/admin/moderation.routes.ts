import {
  catalogQueueQuerySchema,
  err,
  errorToStatus,
  HTTP_STATUS,
  isApiSuccess,
  moderateContentBodySchema,
  moderateProfileBodySchema,
  ok,
} from '@aurore/shared'

import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { logger } from '../../lib/logger'
import { zValidator } from '../../utils/validator'
import { applyAuthedGuards } from '../auth/authed-guards'
import { getAuthedUserId, requireAdmin, requireContentModerator } from '../auth/middleware'
import {
  listCatalogQueue,
  moderateIngredient,
  moderateProduct,
  moderateProfileVisibility,
  moderateReply,
  moderateReview,
  moderateThread,
  previewIngredient,
  previewProduct,
  previewReply,
  previewReview,
  previewThread,
} from './moderation.service'

const idParam = z.object({ id: z.uuid() })
const userIdParam = z.object({ userId: z.uuid() })

// Blanket guards (rate limit/JWT/not-banned/RLS) via applyAuthedGuards.
// Authz is per-route, not blanket: content moderation opens to admin or contributor,
// while force-private and catalog-hide stay admin-only.
const app = applyAuthedGuards(new Hono<AppEnv>())

export const adminModerationRoutes = app
  // Literal /catalog must be registered before /:id to avoid path shadowing.
  .get(
    '/catalog',
    requireContentModerator,
    zValidator('query', catalogQueueQuerySchema),
    async (c) => {
      const filters = c.req.valid('query')
      const result = await listCatalogQueue(c.get('db'), filters)
      return c.json(ok(result), HTTP_STATUS.OK)
    }
  )
  .patch(
    '/reviews/:id',
    requireContentModerator,
    zValidator('param', idParam),
    zValidator('json', moderateContentBodySchema),
    async (c) => {
      const { id } = c.req.valid('param')
      const body = c.req.valid('json')
      const adminId = getAuthedUserId(c)

      const result = await moderateReview(c.get('db'), { id, adminId, body })
      if (!isApiSuccess(result)) {
        return c.json(err(result.error), errorToStatus(result.error, {}))
      }
      logger.info({ adminId, target: 'review', id, status: body.status }, 'content moderated')
      return c.json(ok(result.data), HTTP_STATUS.OK)
    }
  )
  .patch(
    '/threads/:id',
    requireContentModerator,
    zValidator('param', idParam),
    zValidator('json', moderateContentBodySchema),
    async (c) => {
      const { id } = c.req.valid('param')
      const body = c.req.valid('json')
      const adminId = getAuthedUserId(c)

      const result = await moderateThread(c.get('db'), { id, adminId, body })
      if (!isApiSuccess(result)) {
        return c.json(err(result.error), errorToStatus(result.error, {}))
      }
      logger.info({ adminId, target: 'thread', id, status: body.status }, 'content moderated')
      return c.json(ok(result.data), HTTP_STATUS.OK)
    }
  )
  .patch(
    '/replies/:id',
    requireContentModerator,
    zValidator('param', idParam),
    zValidator('json', moderateContentBodySchema),
    async (c) => {
      const { id } = c.req.valid('param')
      const body = c.req.valid('json')
      const adminId = getAuthedUserId(c)

      const result = await moderateReply(c.get('db'), { id, adminId, body })
      if (!isApiSuccess(result)) {
        return c.json(err(result.error), errorToStatus(result.error, {}))
      }
      logger.info({ adminId, target: 'reply', id, status: body.status }, 'content moderated')
      return c.json(ok(result.data), HTTP_STATUS.OK)
    }
  )
  .get('/reviews/:id', requireContentModerator, zValidator('param', idParam), async (c) => {
    const { id } = c.req.valid('param')
    const result = await previewReview(c.get('db'), id)
    if (!isApiSuccess(result)) {
      return c.json(err(result.error), errorToStatus(result.error, {}))
    }
    return c.json(ok(result.data), HTTP_STATUS.OK)
  })
  .get('/threads/:id', requireContentModerator, zValidator('param', idParam), async (c) => {
    const { id } = c.req.valid('param')
    const result = await previewThread(c.get('db'), id)
    if (!isApiSuccess(result)) {
      return c.json(err(result.error), errorToStatus(result.error, {}))
    }
    return c.json(ok(result.data), HTTP_STATUS.OK)
  })
  .get('/replies/:id', requireContentModerator, zValidator('param', idParam), async (c) => {
    const { id } = c.req.valid('param')
    const result = await previewReply(c.get('db'), id)
    if (!isApiSuccess(result)) {
      return c.json(err(result.error), errorToStatus(result.error, {}))
    }
    return c.json(ok(result.data), HTTP_STATUS.OK)
  })
  .get('/products/:id', requireContentModerator, zValidator('param', idParam), async (c) => {
    const { id } = c.req.valid('param')
    const result = await previewProduct(c.get('db'), id)
    if (!isApiSuccess(result)) {
      return c.json(err(result.error), errorToStatus(result.error, {}))
    }
    return c.json(ok(result.data), HTTP_STATUS.OK)
  })
  .get('/ingredients/:id', requireContentModerator, zValidator('param', idParam), async (c) => {
    const { id } = c.req.valid('param')
    const result = await previewIngredient(c.get('db'), id)
    if (!isApiSuccess(result)) {
      return c.json(err(result.error), errorToStatus(result.error, {}))
    }
    return c.json(ok(result.data), HTTP_STATUS.OK)
  })
  .patch(
    '/profiles/:userId/visibility',
    requireAdmin,
    zValidator('param', userIdParam),
    zValidator('json', moderateProfileBodySchema),
    async (c) => {
      const { userId: targetUserId } = c.req.valid('param')
      const body = c.req.valid('json')
      const adminId = getAuthedUserId(c)

      const result = await moderateProfileVisibility(c.get('db'), {
        targetUserId,
        adminId,
        body,
      })
      if (!isApiSuccess(result)) {
        return c.json(err(result.error), errorToStatus(result.error, {}))
      }
      logger.info(
        { adminId, target: 'profile', targetUserId, forcedPrivate: body.forcedPrivate },
        'profile visibility moderated'
      )
      return c.json(ok(result.data), HTTP_STATUS.OK)
    }
  )
  .patch(
    '/products/:id',
    requireContentModerator,
    zValidator('param', idParam),
    zValidator('json', moderateContentBodySchema),
    async (c) => {
      const { id } = c.req.valid('param')
      const body = c.req.valid('json')
      const adminId = getAuthedUserId(c)

      const result = await moderateProduct(c.get('db'), { id, adminId, body })
      if (!isApiSuccess(result)) {
        return c.json(err(result.error), errorToStatus(result.error, {}))
      }
      logger.info({ adminId, target: 'product', id, status: body.status }, 'content moderated')
      return c.json(ok(result.data), HTTP_STATUS.OK)
    }
  )
  .patch(
    '/ingredients/:id',
    requireContentModerator,
    zValidator('param', idParam),
    zValidator('json', moderateContentBodySchema),
    async (c) => {
      const { id } = c.req.valid('param')
      const body = c.req.valid('json')
      const adminId = getAuthedUserId(c)

      const result = await moderateIngredient(c.get('db'), { id, adminId, body })
      if (!isApiSuccess(result)) {
        return c.json(err(result.error), errorToStatus(result.error, {}))
      }
      logger.info({ adminId, target: 'ingredient', id, status: body.status }, 'content moderated')
      return c.json(ok(result.data), HTTP_STATUS.OK)
    }
  )
