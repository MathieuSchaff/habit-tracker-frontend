import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'

import type { AppEnv } from '../../app-env'

const pingRoute = createRoute({
  method: 'get',
  path: '/health',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ ok: z.literal(true) }),
        },
      },
      description: 'Health check',
    },
  },
})

export const healthRoute = new OpenAPIHono<AppEnv>().openapi(pingRoute, (c) => {
  return c.json({ ok: true as const })
})
