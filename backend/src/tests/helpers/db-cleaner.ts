import { sql } from 'drizzle-orm'

import { testDb } from '../db.test.config'

export async function cleanDatabase() {
  try {
    await testDb.execute(sql`SET session_replication_role = replica`)

    const tables = [
      'habit_checks',
      'habit_reminders',
      'habit_timings',
      'habit_frequencies',
      'habit_periods',
      'daily_logs',
      'habits',
      'sessions',
      'profiles',
      'product_stock',
      'product_pages',
      'products',
      'users',
    ]

    for (const table of tables) {
      await testDb.execute(sql.raw(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`))
    }

    await testDb.execute(sql`SET session_replication_role = DEFAULT`)
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage de la DB:', error)
    await testDb.execute(sql`SET session_replication_role = DEFAULT`)
    throw error
  }
}
