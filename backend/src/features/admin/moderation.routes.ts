import {
  err,
  errorToStatus,
  HTTP_STATUS,
  isApiSuccess,
  moderateContentBodySchema,
  moderateProfileBodySchema,
  ok,
} from '@habit-tracker/shared'

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { logger } from '../../lib/logger'
import { rateLimiterFunc } from '../../utils/rateLimiter'
import { requireAdmin, requireJwtAuth, requireNotBanned } from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
import {
  moderateProfileVisibility,
  moderateReply,
  moderateReview,
  moderateThread,
  previewReply,
  previewReview,
  previewThread,
} from './moderation.service'

const idParam = z.object({ id: z.uuid() })
const userIdParam = z.object({ userId: z.uuid() })

const app = new Hono<AppEnv>()

app.use('*', rateLimiterFunc)
app.use('*', requireJwtAuth)
app.use('*', requireNotBanned)
app.use('*', requireAdmin)
// Binds app.role='admin' inside a tx so admin_bypass RLS policies fire on
// the cross-user writes that moderation performs. Without it, app_runtime
// (NO BYPASSRLS) sees auth.role()=NULL and every UPDATE touches 0 rows.
app.use('*', withRlsContext)

export const adminModerationRoutes = app
  .patch(
    '/reviews/:id',
    zValidator('param', idParam),
    zValidator('json', moderateContentBodySchema),
    async (c) => {
      const { id } = c.req.valid('param')
      const body = c.req.valid('json')
      const adminId = c.get('userId')

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
    zValidator('param', idParam),
    zValidator('json', moderateContentBodySchema),
    async (c) => {
      const { id } = c.req.valid('param')
      const body = c.req.valid('json')
      const adminId = c.get('userId')

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
    zValidator('param', idParam),
    zValidator('json', moderateContentBodySchema),
    async (c) => {
      const { id } = c.req.valid('param')
      const body = c.req.valid('json')
      const adminId = c.get('userId')

      const result = await moderateReply(c.get('db'), { id, adminId, body })
      if (!isApiSuccess(result)) {
        return c.json(err(result.error), errorToStatus(result.error, {}))
      }
      logger.info({ adminId, target: 'reply', id, status: body.status }, 'content moderated')
      return c.json(ok(result.data), HTTP_STATUS.OK)
    }
  )
  .get('/reviews/:id', zValidator('param', idParam), async (c) => {
    const { id } = c.req.valid('param')
    const result = await previewReview(c.get('db'), id)
    if (!isApiSuccess(result)) {
      return c.json(err(result.error), errorToStatus(result.error, {}))
    }
    return c.json(ok(result.data), HTTP_STATUS.OK)
  })
  .get('/threads/:id', zValidator('param', idParam), async (c) => {
    const { id } = c.req.valid('param')
    const result = await previewThread(c.get('db'), id)
    if (!isApiSuccess(result)) {
      return c.json(err(result.error), errorToStatus(result.error, {}))
    }
    return c.json(ok(result.data), HTTP_STATUS.OK)
  })
  .get('/replies/:id', zValidator('param', idParam), async (c) => {
    const { id } = c.req.valid('param')
    const result = await previewReply(c.get('db'), id)
    if (!isApiSuccess(result)) {
      return c.json(err(result.error), errorToStatus(result.error, {}))
    }
    return c.json(ok(result.data), HTTP_STATUS.OK)
  })
  .patch(
    '/profiles/:userId/visibility',
    zValidator('param', userIdParam),
    zValidator('json', moderateProfileBodySchema),
    async (c) => {
      const { userId: targetUserId } = c.req.valid('param')
      const body = c.req.valid('json')
      const adminId = c.get('userId')

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
