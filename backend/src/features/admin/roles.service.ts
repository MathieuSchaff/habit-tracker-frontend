import type { UpdateRoleResult } from '@aurore/shared'

import { eq } from 'drizzle-orm'

import type { Database } from '../../db'
import { users, usersSafe } from '../../db/schema'

type DemoteArgs = { adminId: string; targetUserId: string; role: 'user' }

// Only contributors are demotable: rejects admins and plain users so the affordance
// cannot silently change unintended roles.
export async function demoteToUser(
  db: Database,
  { adminId, targetUserId, role }: DemoteArgs
): Promise<UpdateRoleResult> {
  if (adminId === targetUserId) {
    return { success: false, error: 'cannot_self_demote' }
  }

  const [target] = await db
    .select({ id: usersSafe.id, role: usersSafe.role })
    .from(usersSafe)
    .where(eq(usersSafe.id, targetUserId))
    .limit(1)

  if (!target) {
    return { success: false, error: 'not_found' }
  }

  if (target.role !== 'contributor') {
    return { success: false, error: 'not_a_contributor' }
  }

  const [row] = await db
    .update(users)
    .set({ role })
    .where(eq(users.id, targetUserId))
    .returning({ id: users.id, role: users.role })

  if (!row) {
    return { success: false, error: 'server_error' }
  }

  return { success: true, data: row }
}
