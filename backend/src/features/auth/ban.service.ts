import type { BanScope } from '@aurore/shared'

import { and, desc, eq, gt, isNull, or } from 'drizzle-orm'

import type { Database, Transaction } from '../../db'
import { type UserBan, userBans } from '../../db/schema'

// Admin-pool query bypasses RLS: identity-layer read, caller already authenticated
// by requireJwtAuth. 30s TTL bounds window where a freshly banned user gets through
// (vs ~15min token lifetime without enforcement).
const CACHE_TTL_MS = 30_000
const CACHE_MAX = 5000

type CacheEntry = { ban: UserBan | null; expiresAt: number }
const cache = new Map<string, CacheEntry>()

function readCache(userId: string): CacheEntry | null {
  const hit = cache.get(userId)
  if (!hit) return null
  if (hit.expiresAt <= Date.now()) {
    cache.delete(userId)
    return null
  }
  return hit
}

function writeCache(userId: string, ban: UserBan | null): void {
  if (cache.size >= CACHE_MAX) {
    // Map iteration is insertion-ordered, so first key is oldest.
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(userId, { ban, expiresAt: Date.now() + CACHE_TTL_MS })
}

// Matches the given scope or any active 'global' ban. Active = expiresAt IS NULL OR expiresAt > now().
// useCache=false reads fresh and skips the cache entirely. The login gate uses
// it: a one-shot security check shouldn't trust (nor warm) the request-path
// cache, else a login warms `null` and masks a ban applied seconds later.
export async function isUserBanned(
  db: Database | Transaction,
  userId: string,
  scope: 'global' = 'global',
  useCache = true
): Promise<UserBan | null> {
  if (useCache) {
    const cached = readCache(userId)
    if (cached) return cached.ban
  }

  const nowIso = new Date().toISOString()
  const rows = await db
    .select()
    .from(userBans)
    .where(
      and(
        eq(userBans.userId, userId),
        eq(userBans.scope, scope),
        or(isNull(userBans.expiresAt), gt(userBans.expiresAt, nowIso))
      )
    )
    .orderBy(desc(userBans.createdAt))
    .limit(1)

  const ban = rows[0] ?? null
  if (useCache) writeCache(userId, ban)
  return ban
}

// No cache: write paths are cold vs /auth/session, and per-scope cache keys complicate
// invalidation when bans are created or lifted.
export async function isUserBannedForScope(
  db: Database,
  userId: string,
  scope: BanScope
): Promise<UserBan | null> {
  const nowIso = new Date().toISOString()
  const rows = await db
    .select()
    .from(userBans)
    .where(
      and(
        eq(userBans.userId, userId),
        eq(userBans.scope, scope),
        or(isNull(userBans.expiresAt), gt(userBans.expiresAt, nowIso))
      )
    )
    .orderBy(desc(userBans.createdAt))
    .limit(1)

  return rows[0] ?? null
}

// Invalidate cache when a ban is created/lifted out-of-band (test/admin helper).
export function clearBanCache(userId?: string): void {
  if (userId) cache.delete(userId)
  else cache.clear()
}

// Test-only: counts entries in the ban cache.
export function _banCacheSize(): number {
  return cache.size
}
