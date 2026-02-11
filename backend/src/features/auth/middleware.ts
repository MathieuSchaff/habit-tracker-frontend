import { err, HTTP_STATUS } from '@habit-tracker/shared'

import type { Context, Next } from 'hono'

import type { AppEnv } from '../../app-env'
import { verifyAccessToken } from './jwt.utils'

/**
 * Middleware JWT : vérifie l'access token dans le header Authorization.
 * Si invalide ou expiré → 401 (le client doit appeler /api/auth//refresh).
 */
export const requireJwtAuth = async (c: Context<AppEnv>, next: Next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json(err('unauthorized'), HTTP_STATUS.UNAUTHORIZED)
  }

  const token = authHeader.substring(7)
  const jwtSecret = c.get('jwtSecret')

  const payload = await verifyAccessToken(token, jwtSecret)

  if (!payload) {
    return c.json(err('unauthorized'), HTTP_STATUS.UNAUTHORIZED)
  }

  c.set('userId', payload.sub)

  await next()
}
