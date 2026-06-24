import {
  err,
  HTTP_STATUS,
  ok,
  profileUpdateSchema,
  updatePrivacySettingsSchema,
  updateUserPreferencesSchema,
  userDermoProfileUpdateSchema,
} from '@aurore/shared'

import { Hono } from 'hono'

import type { AppEnv } from '../../app-env'
import { db as baseDb } from '../../db'
import { zValidator } from '../../utils/validator'
import { getAuthedUserId, requireJwtAuth, requireNotBanned } from '../auth/middleware'
import { withRlsContext } from '../auth/rls-context.middleware'
import { getUserById } from '../auth/user.utils'
import { securityScan } from '../security/security.middleware'
import { logSecurityEvent } from '../security/security.service'
import { checkExportRateLimit, exportFilename, exportUserData } from './export.service'
import {
  deleteUser,
  getDermoProfile,
  getPrivacySettings,
  getProfile,
  getProfileStats,
  getUserPreferences,
  updatePrivacySettings,
  updateProfile,
  updateUserPreferences,
  upsertDermoProfile,
} from './service'

const app = new Hono<AppEnv>()

app.use('*', requireJwtAuth)
app.use('*', requireNotBanned)
app.use('*', withRlsContext)

export const profileRoute = app

  .get('/', async (c) => {
    const db = c.get('db')
    const userId = getAuthedUserId(c)
    const profile = await getProfile(db, userId)

    if (!profile) {
      return c.json(err('not_found'), HTTP_STATUS.NOT_FOUND)
    }

    return c.json(ok(profile), HTTP_STATUS.OK)
  })

  .get('/stats', async (c) => {
    const db = c.get('db')
    const userId = getAuthedUserId(c)
    const stats = await getProfileStats(db, userId)
    return c.json(ok(stats), HTTP_STATUS.OK)
  })

  .patch('/', securityScan(), zValidator('json', profileUpdateSchema), async (c) => {
    const db = c.get('db')
    const userId = getAuthedUserId(c)

    const data = c.req.valid('json')
    const updated = await updateProfile(db, userId, data)

    if (!updated) {
      return c.json(err('not_found'), HTTP_STATUS.NOT_FOUND)
    }

    return c.json(ok(updated), HTTP_STATUS.OK)
  })

  .get('/preferences', async (c) => {
    const db = c.get('db')
    const userId = getAuthedUserId(c)
    const prefs = await getUserPreferences(db, userId)
    return c.json(ok(prefs), HTTP_STATUS.OK)
  })

  .patch('/preferences', zValidator('json', updateUserPreferencesSchema), async (c) => {
    const db = c.get('db')
    const userId = getAuthedUserId(c)
    const data = c.req.valid('json')
    const updated = await updateUserPreferences(db, userId, data)
    return c.json(ok(updated), HTTP_STATUS.OK)
  })

  .get('/dermo', async (c) => {
    const db = c.get('db')
    const userId = getAuthedUserId(c)
    const profile = await getDermoProfile(db, userId)
    return c.json(ok(profile), HTTP_STATUS.OK)
  })

  .patch('/dermo', zValidator('json', userDermoProfileUpdateSchema), async (c) => {
    const db = c.get('db')
    const userId = getAuthedUserId(c)
    const data = c.req.valid('json')
    const updated = await upsertDermoProfile(db, userId, data)
    return c.json(ok(updated), HTTP_STATUS.OK)
  })
  .get('/privacy-settings', async (c) => {
    const db = c.get('db')
    const userId = getAuthedUserId(c)
    const settings = await getPrivacySettings(db, userId)
    return c.json(ok(settings), HTTP_STATUS.OK)
  })
  .patch('/privacy-settings', zValidator('json', updatePrivacySettingsSchema), async (c) => {
    const db = c.get('db')
    const userId = getAuthedUserId(c)
    const data = c.req.valid('json')
    const updated = await updatePrivacySettings(db, userId, data)

    if (!updated) {
      return c.json(err('not_found'), HTTP_STATUS.NOT_FOUND)
    }

    return c.json(ok(updated), HTTP_STATUS.OK)
  })

  .delete('/deleteUser', async (c) => {
    const db = c.get('db')
    const userId = getAuthedUserId(c)
    await deleteUser(db, userId)
    return c.body(null, 204)
  })

  // RGPD Article 20: data portability. JSON dump of every tenant-scoped row
  // the user owns. RLS narrows reads to auth.uid(); discussions are filtered
  // by author_id explicitly (no RLS on those tables).
  .get('/export', async (c) => {
    const userId = getAuthedUserId(c)
    const db = c.get('db')

    // Demo accounts have no meaningful data to export and each call pollutes the
    // security journal with a data_export_requested event. Block them up front.
    const requester = await getUserById(db, userId)
    if (requester?.isDemo) {
      return c.json(err('forbidden'), HTTP_STATUS.FORBIDDEN)
    }

    const rate = checkExportRateLimit(userId)
    if (!rate.ok) {
      return c.json(
        err('rate_limit_exceeded', { retryAfter: rate.retryAfterSec }),
        HTTP_STATUS.RATE_LIMIT_EXCEEDED
      )
    }

    const data = await exportUserData(db, userId)

    // Audit trail (RGPD). Best-effort on the base pool, NOT the request tx:
    // a swallowed insert on the tx would commit an aborted tx (RLS invariant).
    // Runs after the read succeeds, so it only logs real exports.
    await logSecurityEvent(baseDb, {
      userId,
      severity: 'low',
      eventType: 'data_export_requested',
      field: 'export',
      payload: 'json',
      route: '/profile/export',
    }).catch(() => {})

    return c.body(JSON.stringify(data, null, 2), HTTP_STATUS.OK, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${exportFilename(userId)}"`,
      'Cache-Control': 'no-store',
    })
  })
