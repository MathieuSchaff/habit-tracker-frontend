import { ok } from '@habit-tracker/shared'

import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'

const pingRoute = createRoute({
  method: 'get',
  path: '/',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.literal(true),
            message: z.string().optional(),
          }),
        },
      },
      description: 'Health check',
    },
  },
})

export const healthRoute = new OpenAPIHono<AppEnv>().openapi(pingRoute, (c) => {
  return c.json(ok(true), 200)
})
