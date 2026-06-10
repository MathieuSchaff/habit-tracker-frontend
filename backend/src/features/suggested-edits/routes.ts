import { createSuggestedEditBodySchema, HTTP_STATUS, ok } from '@aurore/shared'

import { Hono } from 'hono'

import type { AppEnv } from '../../app-env'
import { zValidator } from '../../utils/validator'
import { applyAuthedGuards } from '../auth/authed-guards'
import { getAuthedUserId } from '../auth/middleware'
import { createSuggestedEdit } from './service'

const app = applyAuthedGuards(new Hono<AppEnv>())

export const suggestedEditsRoutes = app.post(
  '/',
  zValidator('json', createSuggestedEditBodySchema),
  async (c) => {
    const proposerId = getAuthedUserId(c)
    const body = c.req.valid('json')
    const edit = await createSuggestedEdit(c.get('db'), { proposerId, body })
    return c.json(ok(edit), HTTP_STATUS.CREATED)
  }
)
