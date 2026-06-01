import type {
  AdminUserListItem,
  ApiResponse,
  BanScope,
  CreateBanInput,
  CreateBanResult,
  UpdateBanInput,
  UpdateBanResult,
} from '@aurore/shared'

import { desc, eq, sql } from 'drizzle-orm'

import type { Database } from '../../db'
import { type UserBan, userBans, usersSafe } from '../../db/schema'
import { profiles } from '../../db/schema/auth/users'
import { clearBanCache } from '../auth/ban.service'

// V1 lists the 100 most recent users — no pagination / search until admin volume
// justifies it. Cap exists to avoid accidental table scans through the API.
const ADMIN_USERS_LIST_LIMIT = 100

type CreateBanArgs = {
  // The moderator performing the ban (admin or contributor) — recorded as bannedBy.
  actorId: string
  targetUserId: string
  body: CreateBanInput
}

export async function createBan(
  db: Database,
  { actorId, targetUserId, body }: CreateBanArgs
): Promise<CreateBanResult> {
  if (actorId === targetUserId) {
    return { success: false, error: 'cannot_self_ban' }
  }

  if (body.expiresAt && Date.parse(body.expiresAt) <= Date.now()) {
    return { success: false, error: 'invalid_input' }
  }

  const [target] = await db
    .select({ id: usersSafe.id })
    .from(usersSafe)
    .where(eq(usersSafe.id, targetUserId))
    .limit(1)

  if (!target) {
    return { success: false, error: 'not_found' }
  }

  const [row] = await db
    .insert(userBans)
    .values({
      userId: targetUserId,
      scope: body.scope,
      reason: body.reason ?? null,
      bannedBy: actorId,
      expiresAt: body.expiresAt ?? null,
    })
    .returning()

  if (!row) {
    return { success: false, error: 'server_error' }
  }

  clearBanCache(targetUserId)
  return { success: true, data: row }
}

// Reads a ban's scope so the route can gate a contributor away from 'global'
// (account lockout) before liftBan runs. Returns null when the ban is absent —
// the caller then falls through to liftBan's not_found path (ADR-0006 S4).
export async function getBanScope(db: Database, banId: string): Promise<BanScope | null> {
  const [row] = await db
    .select({ scope: userBans.scope })
    .from(userBans)
    .where(eq(userBans.id, banId))
    .limit(1)
  return row?.scope ?? null
}

export async function listUserBans(db: Database, userId: string): Promise<UserBan[]> {
  return db
    .select()
    .from(userBans)
    .where(eq(userBans.userId, userId))
    .orderBy(desc(userBans.createdAt))
}

export type LiftBanResult = ApiResponse<null, 'not_found' | 'server_error'>

export async function liftBan(db: Database, banId: string): Promise<LiftBanResult> {
  const deleted = await db
    .delete(userBans)
    .where(eq(userBans.id, banId))
    .returning({ userId: userBans.userId })

  const row = deleted[0]
  if (!row) return { success: false, error: 'not_found' }

  clearBanCache(row.userId)
  return { success: true, data: null }
}

export async function updateBan(
  db: Database,
  banId: string,
  body: UpdateBanInput
): Promise<UpdateBanResult> {
  if (body.expiresAt && Date.parse(body.expiresAt) <= Date.now()) {
    return { success: false, error: 'invalid_input' }
  }

  const updates: { reason?: string | null; expiresAt?: string | null } = {}
  if (body.reason !== undefined) updates.reason = body.reason
  if (body.expiresAt !== undefined) updates.expiresAt = body.expiresAt

  // Defensive: zod's .refine guarantees at least one field, but keep the guard
  // so the service is safe under direct calls (seed, future internal callers).
  if (Object.keys(updates).length === 0) {
    return { success: false, error: 'invalid_input' }
  }

  const [row] = await db.update(userBans).set(updates).where(eq(userBans.id, banId)).returning()
  if (!row) return { success: false, error: 'not_found' }

  clearBanCache(row.userId)
  return { success: true, data: row }
}

export async function listUsers(db: Database): Promise<AdminUserListItem[]> {
  const rows = await db
    .select({
      id: usersSafe.id,
      email: usersSafe.email,
      role: usersSafe.role,
      emailVerifiedAt: usersSafe.emailVerifiedAt,
      createdAt: usersSafe.createdAt,
      // LEFT JOIN: profile row is optional during the brief window between
      // user signup and profile creation. Coerce to false so the API always
      // returns a boolean.
      forcedPrivateByAdmin: sql<boolean>`COALESCE(${profiles.forcedPrivateByAdmin}, false)`,
    })
    .from(usersSafe)
    .leftJoin(profiles, eq(profiles.userId, usersSafe.id))
    .orderBy(desc(usersSafe.createdAt))
    .limit(ADMIN_USERS_LIST_LIMIT)
  return rows
}
