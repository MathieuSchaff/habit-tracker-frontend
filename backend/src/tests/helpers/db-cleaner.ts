import { sql } from 'drizzle-orm'

import { testDb } from '../db.test.config'

// Cached across calls — pg_tables list doesn't change inside a test run, and the
// schema has no SERIAL/IDENTITY columns (all PKs are uuidv7), so we can drop
// RESTART IDENTITY too.
let cachedTables: string[] | null = null

export async function cleanDatabase() {
  console.log('🧹 Cleaning database...')
  try {
    if (cachedTables === null) {
      const rows = await testDb.execute<{ tablename: string }>(
        sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
      )
      cachedTables = rows.map((r) => r.tablename)
    }
    if (cachedTables.length === 0) return

    await testDb.execute(sql`SET session_replication_role = replica`)
    await testDb.execute(sql.raw(`TRUNCATE TABLE ${cachedTables.join(', ')} CASCADE`))
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage de la DB:', error)
    throw error
  } finally {
    await testDb.execute(sql`SET session_replication_role = DEFAULT`)
  }
}
