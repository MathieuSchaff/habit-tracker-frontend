import type { AdminDashboard } from '@aurore/shared'

import { eq, gt, isNull, or, sql } from 'drizzle-orm'

import type { Database } from '../../db'
import { contentReports, roleRequests, userBans } from '../../db/schema'
import { profiles } from '../../db/schema/auth/users'
import { discussionReplies, discussionThreads } from '../../db/schema/products/discussions'
import { userProductReviews } from '../../db/schema/products/user-products'
import { nowISO } from '../../utils/dates'

export async function getAdminDashboard(db: Database): Promise<AdminDashboard> {
  const nowIso = nowISO()

  const [
    openReportsRows,
    activeBansRows,
    hiddenReviewsRows,
    hiddenThreadsRows,
    hiddenRepliesRows,
    forcedPrivateRows,
    pendingRoleRequestsRows,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(contentReports)
      .where(eq(contentReports.status, 'open')),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(userBans)
      .where(or(isNull(userBans.expiresAt), gt(userBans.expiresAt, nowIso))),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(userProductReviews)
      .where(eq(userProductReviews.moderationStatus, 'hidden')),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(discussionThreads)
      .where(eq(discussionThreads.moderationStatus, 'hidden')),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(discussionReplies)
      .where(eq(discussionReplies.moderationStatus, 'hidden')),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(profiles)
      .where(eq(profiles.forcedPrivateByAdmin, true)),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(roleRequests)
      .where(eq(roleRequests.status, 'pending')),
  ])

  return {
    openReports: openReportsRows[0]?.count ?? 0,
    activeBans: activeBansRows[0]?.count ?? 0,
    hiddenReviews: hiddenReviewsRows[0]?.count ?? 0,
    hiddenThreads: hiddenThreadsRows[0]?.count ?? 0,
    hiddenReplies: hiddenRepliesRows[0]?.count ?? 0,
    forcedPrivateProfiles: forcedPrivateRows[0]?.count ?? 0,
    pendingRoleRequests: pendingRoleRequestsRows[0]?.count ?? 0,
  }
}
