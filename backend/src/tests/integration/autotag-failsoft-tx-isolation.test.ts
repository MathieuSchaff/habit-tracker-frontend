import { describe, expect, it } from 'bun:test'

import { eq } from 'drizzle-orm'

import { errorGroups, errorOccurrences } from '../../db/schema'
import { trackError } from '../../features/errors/service'
import { nowISO } from '../../utils/dates'
import { testDb } from '../db.test.config'
import { setupDbTests } from '../db-setup'
import { createTestUser } from '../helpers/test-factories'

setupDbTests()

// Premise behind writeTagsForProductFailSoft (auto-tagging/write.ts): writeTagsForProduct
// wraps its tag delete+insert in a nested database.transaction() (write.ts:98). When the
// outer `database` is the request RLS tx, that nested tx must behave as a SAVEPOINT so a
// failing tag write rolls back to the savepoint and leaves the OUTER request tx usable for
// the catch's recordAutoTagSkip -> trackError. This proves bun-sql honors that; if it does
// not, the auto-tag fail-soft is exposed to the same poisoned-tx trap as the security twin.
describe('auto-tag fail-soft tx isolation', () => {
  it('savepoint-contains a failed nested write so trackError on the outer tx still commits', async () => {
    const user = await createTestUser('autotag-savepoint@test.local', 'Azerty123!')

    let innerError: unknown = null

    await testDb.transaction(async (outerTx) => {
      // Mirror writeTagsForProduct:98 — failing write inside a nested tx (savepoint).
      // Orphan groupId violates the errorOccurrences FK => a real DB error, like a failing
      // tag insert. Captured + swallowed exactly as writeTagsForProductFailSoft does.
      await outerTx
        .transaction(async (inner) => {
          await inner.insert(errorOccurrences).values({
            groupId: '00000000-0000-0000-0000-000000000000',
            userId: null,
            occurredAt: nowISO(),
          })
        })
        .catch((e) => {
          innerError = e
        })

      // recordAutoTagSkip equivalent: must succeed iff the savepoint left the outer tx clean.
      await trackError(outerTx, { source: 'backend', message: 'autotag-savepoint-probe', userId: user.id })
    })

    // Guard against a false GREEN: the inner write must have genuinely failed (not a silent
    // "nested tx unsupported"), otherwise the savepoint was never exercised.
    expect(innerError).not.toBeNull()

    // Outer tx committed => trackError persisted => savepoint contained the failure.
    const groups = await testDb
      .select()
      .from(errorGroups)
      .where(eq(errorGroups.message, 'autotag-savepoint-probe'))
    expect(groups).toHaveLength(1)
  })
})
