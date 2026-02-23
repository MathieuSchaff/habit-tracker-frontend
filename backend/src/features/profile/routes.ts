import {
  err,
  errorResponse,
  HTTP_STATUS,
  ok,
  profilePublicSchema,
  profileUpdateSchema,
  successResponse,
} from '@habit-tracker/shared'

import { createRoute, OpenAPIHono } from '@hono/zod-openapi'

import type { AppEnv } from '../../app-env'
import { requireJwtAuth } from '../auth/middleware'
import { getProfile, updateProfile } from './service'

// Route Definitions

const getMeRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Profile'],
  summary: 'Get current user profile',
  security: [{ Bearer: [] }],
  responses: {
    [HTTP_STATUS.OK]: successResponse(profilePublicSchema, 'Profile retrieved'),
    [HTTP_STATUS.NOT_FOUND]: errorResponse('Profile not found'),
    [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Not authenticated'),
  },
})

const updateProfileRoute = createRoute({
  method: 'patch',
  path: '/',
  tags: ['Profile'],
  summary: 'Update current user profile',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: profileUpdateSchema } },
    },
  },
  responses: {
    [HTTP_STATUS.OK]: successResponse(profilePublicSchema, 'Profile updated'),
    [HTTP_STATUS.NOT_FOUND]: errorResponse('Profile not found'),
    [HTTP_STATUS.UNAUTHORIZED]: errorResponse('Not authenticated'),
    [HTTP_STATUS.BAD_REQUEST]: errorResponse('Validation error'),
  },
})

// App + Handlers

const app = new OpenAPIHono<AppEnv>()

// app.use(path, middleware) retourne Hono et non OpenAPIHono — l'enregistrer
// séparément avant la chaîne .openapi() pour conserver le typage complet sur c
app.use('*', requireJwtAuth)

app.onError((e, c) => {
  console.error('Profile error:', e)
  return c.json(
    err('server_error', e instanceof Error ? e.message : undefined),
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  )
})

export const profileRoute = app

  .openapi(getMeRoute, async (c) => {
    const db = c.get('db')
    const userId = c.get('userId')
    console.log(userId)
    const profile = await getProfile(db, userId)

    if (!profile) {
      return c.json(err('not_found'), HTTP_STATUS.NOT_FOUND) as never
    }

    return c.json(ok(profile), HTTP_STATUS.OK)
  })

  .openapi(updateProfileRoute, async (c) => {
    const db = c.get('db')
    const userId = c.get('userId')

    const data = c.req.valid('json')
    const updated = await updateProfile(db, userId, data)

    if (!updated) {
      return c.json(err('not_found'), HTTP_STATUS.NOT_FOUND) as never
    }

    return c.json(ok(updated), HTTP_STATUS.OK)
  })
