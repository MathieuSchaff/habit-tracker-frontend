import { sql } from 'drizzle-orm'

import { testDb } from '../db.test.config'

export async function cleanDatabase() {
  console.log('🧹 Cleaning database...')
  try {
    await testDb.execute(sql`SET session_replication_role = replica`)

    // Fetch all user tables dynamically — no hardcoded list to maintain
    const rows = await testDb.execute<{ tablename: string }>(
      sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
    )
    const tables = rows.map((r) => r.tablename)

    if (tables.length > 0) {
      await testDb.execute(sql.raw(`TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE`))
    }
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage de la DB:', error)
    throw error
  } finally {
    await testDb.execute(sql`SET session_replication_role = DEFAULT`)
  }
}
