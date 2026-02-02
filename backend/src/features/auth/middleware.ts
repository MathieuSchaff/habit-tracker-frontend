import { getCookie } from 'hono/cookie'
import { hashSid } from './utils'
import { findValidSessionBySidHash, updateLastSeen } from './session.service'
import type { Context, Next } from 'hono'
import type { AppEnv } from '../../app-env'
import { err, HTTP_STATUS } from '@habit-tracker/shared'
export const requireAuth = async (c: Context<AppEnv>, next: Next) => {
  const db = c.get('db')
  const sid = getCookie(c, 'sid')
  if (!sid) {
    return c.json(err('unauthorized'), HTTP_STATUS.UNAUTHORIZED)
  }
  const sidHash = hashSid(sid)
  const session = await findValidSessionBySidHash(db, sidHash)

  if (!session) {
    return c.json(err('unauthorized'), HTTP_STATUS.UNAUTHORIZED)
  }
  updateLastSeen(db, sidHash).catch((err) => console.error('Failed to update lastSeenAt:', err))

  //  met session dans contexte
  c.set('session', session)
  c.set('userId', session.userId)

  await next()
}
