import {
  cancelRoleRequestErrorMapping,
  err,
  errorToStatus,
  HTTP_STATUS,
  isApiSuccess,
  ok,
  submitRoleRequestBodySchema,
  submitRoleRequestErrorMapping,
} from '@aurore/shared'

import { Hono } from 'hono'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'
import { logger } from '../../lib/logger'
import { rateLimiterFunc } from '../../utils/rateLimiter'
import { zValidator } from '../../utils/validator'
import { getAuthedUserId, requireJwtAuth, requireNotBanned } from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
import { cancelRoleRequest, getMyRoleRequest, submitRoleRequest } from './service'

const requestIdParam = z.object({ id: z.uuid() })

const app = new Hono<AppEnv>()

app.use('*', rateLimiterFunc)
app.use('*', requireJwtAuth)
app.use('*', requireNotBanned)
app.use('*', withRlsContext)

export const roleRequestsRoutes = app
  .post('/', zValidator('json', submitRoleRequestBodySchema), async (c) => {
    const userId = getAuthedUserId(c)
    const body = c.req.valid('json')

    const result = await submitRoleRequest(c.get('db'), { userId, body })
    if (!isApiSuccess(result)) {
      return c.json(err(result.error), errorToStatus(result.error, submitRoleRequestErrorMapping))
    }

    logger.info({ userId, requestId: result.data.id }, 'role request submitted')
    return c.json(ok(result.data), HTTP_STATUS.CREATED)
  })
  .get('/me', async (c) => {
    const userId = getAuthedUserId(c)
    const request = await getMyRoleRequest(c.get('db'), userId)
    return c.json(ok(request), HTTP_STATUS.OK)
  })
  .post('/:id/cancel', zValidator('param', requestIdParam), async (c) => {
    const userId = getAuthedUserId(c)
    const { id } = c.req.valid('param')

    const result = await cancelRoleRequest(c.get('db'), { userId, id })
    if (!isApiSuccess(result)) {
      return c.json(err(result.error), errorToStatus(result.error, cancelRoleRequestErrorMapping))
    }

    logger.info({ userId, requestId: id }, 'role request cancelled')
    return c.json(ok(result.data), HTTP_STATUS.OK)
  })
