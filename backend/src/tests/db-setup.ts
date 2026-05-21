import { beforeAll, beforeEach } from 'bun:test'

import { sql } from 'drizzle-orm'

import { testDb } from './db.test.config'
import { cleanDatabase } from './helpers/db-cleaner'

let pingDone = false

// Opt-in DB lifecycle. Each DB-touching test file calls setupDbTests() once
// at top-level. Hooks register in the calling file's scope only — pure tests
// that never call this pay zero DB cost.
export function setupDbTests(): void {
  beforeAll(async () => {
    if (pingDone) return
    try {
      await testDb.execute(sql`SELECT 1`)
      pingDone = true
    } catch (error) {
      console.error('❌ Cannot reach test DB at', process.env.DATABASE_URL)
      console.error('Run: just test-db-up')
      throw error
    }
  })

  beforeEach(async () => {
    await cleanDatabase()
  })
}
