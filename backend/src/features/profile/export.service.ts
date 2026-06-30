import {
  type CriteriaWeights,
  type ProfileLink,
  type SkinConcern,
  type SkinType,
  USER_EXPORT_SCHEMA_VERSION,
  type UserExport,
} from '@aurore/shared'

import { eq } from 'drizzle-orm'

import type { DB } from '../../db'
import { userPreferences } from '../../db/schema/auth/user-preferences'
import { profiles, userDermoProfiles, usersSafe } from '../../db/schema/auth/users'
import { userIngredientAnalysisScore } from '../../db/schema/ingredients/user-ingredient-analysis-score'
import { discussionReplies, discussionThreads } from '../../db/schema/products/discussions'
import { purchases } from '../../db/schema/products/purchases'
import { userProductStatusLog } from '../../db/schema/products/user-product-status-log'
import { userProductReviews, userProducts } from '../../db/schema/products/user-products'
import { subtasks, tasks } from '../../db/schema/tasks/tasks'
import { nowISO } from '../../utils/dates'

// Reads run as the RLS-scoped app_runtime role (withRlsContext sets auth.uid()
// to the caller). Tables with tenantPolicies/fkTenantPolicies filter
// automatically; discussion_threads/replies are NOT RLS-scoped, so we add an
// explicit author_id filter to keep ownership semantics consistent.

export async function exportUserData(db: DB, userId: string): Promise<UserExport> {
  // Reads are intentionally sequential: bun-sql + drizzle currently mis-bind
  // result-format codes when many SELECTs are pipelined through a single tx
  // connection (observed as "bind message has N result formats but query has
  // M columns"). One user export = ~13 small queries on a local pg socket,
  // well under any UX threshold, so the loss is negligible.
  const userRow = await db.select().from(usersSafe).where(eq(usersSafe.id, userId)).limit(1)
  const profileRow = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1)
  const dermoRow = await db
    .select()
    .from(userDermoProfiles)
    .where(eq(userDermoProfiles.userId, userId))
    .limit(1)
  const prefsRow = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1)
  const productRows = await db.select().from(userProducts)
  const reviewRows = await db
    .select({
      id: userProductReviews.id,
      userProductId: userProductReviews.userProductId,
      tolerance: userProductReviews.tolerance,
      efficacy: userProductReviews.efficacy,
      sensoriality: userProductReviews.sensoriality,
      stability: userProductReviews.stability,
      mixability: userProductReviews.mixability,
      valueForMoney: userProductReviews.valueForMoney,
      comment: userProductReviews.comment,
      isPublic: userProductReviews.isPublic,
      createdAt: userProductReviews.createdAt,
      updatedAt: userProductReviews.updatedAt,
    })
    .from(userProductReviews)
    .innerJoin(userProducts, eq(userProducts.id, userProductReviews.userProductId))
    .where(eq(userProducts.userId, userId))
  const statusLogRows = await db.select().from(userProductStatusLog)
  const purchaseRows = await db
    .select({
      id: purchases.id,
      userProductId: purchases.userProductId,
      purchasedAt: purchases.purchasedAt,
      pricePaidCents: purchases.pricePaidCents,
      openedAt: purchases.openedAt,
      finishedAt: purchases.finishedAt,
      expiresAt: purchases.expiresAt,
      createdAt: purchases.createdAt,
    })
    .from(purchases)
    .innerJoin(userProducts, eq(userProducts.id, purchases.userProductId))
    .where(eq(userProducts.userId, userId))
  const ingredientScoreRows = await db.select().from(userIngredientAnalysisScore)
  const taskRows = await db.select().from(tasks)
  const subtaskRows = await db
    .select({
      id: subtasks.id,
      taskId: subtasks.taskId,
      title: subtasks.title,
      completed: subtasks.completed,
      order: subtasks.order,
      createdAt: subtasks.createdAt,
    })
    .from(subtasks)
    .innerJoin(tasks, eq(tasks.id, subtasks.taskId))
    .where(eq(tasks.userId, userId))
  const threadRows = await db
    .select({
      id: discussionThreads.id,
      productId: discussionThreads.productId,
      ingredientId: discussionThreads.ingredientId,
      authorId: discussionThreads.authorId,
      title: discussionThreads.title,
      content: discussionThreads.content,
      createdAt: discussionThreads.createdAt,
    })
    .from(discussionThreads)
    .where(eq(discussionThreads.authorId, userId))
  const replyRows = await db
    .select({
      id: discussionReplies.id,
      threadId: discussionReplies.threadId,
      authorId: discussionReplies.authorId,
      content: discussionReplies.content,
      createdAt: discussionReplies.createdAt,
    })
    .from(discussionReplies)
    .where(eq(discussionReplies.authorId, userId))

  const user = userRow[0]
  if (!user) {
    throw new Error(`exportUserData: user ${userId} not found`)
  }

  const profile = profileRow[0]
  const dermo = dermoRow[0]
  const prefs = prefsRow[0]

  return {
    _meta: {
      schemaVersion: USER_EXPORT_SCHEMA_VERSION,
      exportedAt: nowISO(),
      userId,
    },
    user: {
      _meta: {
        id: user.id,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      email: user.email,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt,
      deletedAt: user.deletedAt,
      isDemo: user.isDemo,
      expiresAt: user.expiresAt,
    },
    profile: profile
      ? {
          _meta: {
            userId: profile.userId,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
          },
          username: profile.username,
          bio: profile.bio,
          avatarUrl: profile.avatarUrl,
          links: profile.links as ProfileLink[],
          profilePublic: profile.profilePublic,
          bioPublic: profile.bioPublic,
          avatarPublic: profile.avatarPublic,
          linksPublic: profile.linksPublic,
        }
      : null,
    dermoProfile: dermo
      ? {
          _meta: {
            userId: dermo.userId,
            createdAt: dermo.createdAt,
            updatedAt: dermo.updatedAt,
          },
          skinTypes: (dermo.skinTypes ?? null) as SkinType[] | null,
          fitzpatrickType: dermo.fitzpatrickType,
          skinConcerns: (dermo.skinConcerns ?? []) as SkinConcern[],
          privateNotes: dermo.privateNotes,
          skinTypesPublic: dermo.skinTypesPublic,
          fitzpatrickPublic: dermo.fitzpatrickPublic,
          skinConcernsPublic: dermo.skinConcernsPublic,
        }
      : null,
    preferences: prefs
      ? {
          _meta: {
            userId: prefs.userId,
            updatedAt: prefs.updatedAt,
          },
          criteriaWeights: prefs.criteriaWeights as CriteriaWeights,
          aiConsent: prefs.aiConsent,
        }
      : null,
    products: productRows.map((row) => ({
      _meta: {
        id: row.id,
        userId: row.userId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      productId: row.productId,
      status: row.status,
      sentiment: row.sentiment,
      wouldRepurchase: row.wouldRepurchase,
      comment: row.comment,
      ressenti: row.ressenti,
      routine: row.routine,
      preferences: row.preferences,
    })),
    productReviews: reviewRows.map((row) => ({
      _meta: {
        id: row.id,
        userProductId: row.userProductId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      tolerance: row.tolerance,
      efficacy: row.efficacy,
      sensoriality: row.sensoriality,
      stability: row.stability,
      mixability: row.mixability,
      valueForMoney: row.valueForMoney,
      comment: row.comment,
      isPublic: row.isPublic,
    })),
    productStatusLog: statusLogRows.map((row) => ({
      _meta: {
        id: row.id,
        userId: row.userId,
        userProductId: row.userProductId,
        createdAt: row.createdAt,
      },
      fromStatus: row.fromStatus,
      toStatus: row.toStatus,
      reason: row.reason,
    })),
    purchases: purchaseRows.map((row) => ({
      _meta: {
        id: row.id,
        userProductId: row.userProductId,
        createdAt: row.createdAt,
      },
      purchasedAt: row.purchasedAt,
      pricePaidCents: row.pricePaidCents,
      openedAt: row.openedAt,
      finishedAt: row.finishedAt,
      expiresAt: row.expiresAt,
    })),
    ingredientAnalysisScores: ingredientScoreRows.map((row) => ({
      _meta: {
        id: row.id,
        userId: row.userId,
        ingredientId: row.ingredientId,
        updatedAt: row.updatedAt ?? undefined,
      },
      suspicionScore: row.suspicionScore ?? '0',
      favoriteScore: row.favoriteScore ?? '0',
      isSuspect: row.isSuspect ?? false,
      isFavorite: row.isFavorite ?? false,
    })),
    tasks: taskRows.map((row) => ({
      _meta: {
        id: row.id,
        userId: row.userId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      title: row.title,
      energy: row.energy,
      status: row.status,
      snoozedUntil: row.snoozedUntil,
      doneAt: row.doneAt,
      focusDurationMinutes: row.focusDurationMinutes,
    })),
    subtasks: subtaskRows.map((row) => ({
      _meta: {
        id: row.id,
        taskId: row.taskId,
        createdAt: row.createdAt,
      },
      title: row.title,
      completed: row.completed,
      order: row.order,
    })),
    discussionThreads: threadRows.map((row) => ({
      _meta: {
        id: row.id,
        productId: row.productId,
        ingredientId: row.ingredientId,
        authorId: row.authorId,
        createdAt: row.createdAt,
      },
      title: row.title,
      content: row.content,
    })),
    discussionReplies: replyRows.map((row) => ({
      _meta: {
        id: row.id,
        threadId: row.threadId,
        authorId: row.authorId,
        createdAt: row.createdAt,
      },
      content: row.content,
    })),
  }
}

// Pinned for tests: if a tenant-scoped table is added without showing up here,
// the service-level exhaustivity test fails. Keep in sync with grep
// `tenantPolicies\|fkTenantPolicies` over backend/src/db/schema/.
export const USER_EXPORT_TENANT_TABLES = [
  'users',
  'profiles',
  'user_dermo_profiles',
  'user_preferences',
  'user_products',
  'user_product_reviews',
  'user_product_status_log',
  'purchases',
  'user_ingredient_analysis_score',
  'tasks',
  'subtasks',
  'discussion_threads',
  'discussion_replies',
] as const

export const EXPORT_COOLDOWN_MS = 5 * 60 * 1000

const lastExportAt = new Map<string, number>()

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number }

// Per-user export throttle. In-memory Map is intentional: one VPS, one
// process, low traffic. If the topology grows (multi-replica, fan-out via
// queue), swap for the hono-rate-limiter pattern with a shared store.
export function checkExportRateLimit(userId: string, now: number = Date.now()): RateLimitResult {
  const last = lastExportAt.get(userId)
  if (last !== undefined && now - last < EXPORT_COOLDOWN_MS) {
    return { ok: false, retryAfterSec: Math.ceil((EXPORT_COOLDOWN_MS - (now - last)) / 1000) }
  }
  lastExportAt.set(userId, now)
  return { ok: true }
}

// Test-only escape hatch. The Map is a process singleton, so test order would
// otherwise leak state across cases.
export function resetExportRateLimit(): void {
  lastExportAt.clear()
}

export function exportFilename(userId: string, now: Date = new Date()): string {
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  return `aurore-export-${userId}-${yyyy}${mm}${dd}.json`
}
