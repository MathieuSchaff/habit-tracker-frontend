import { sql } from 'drizzle-orm'

import { testDb } from '../db.test.config'

export async function cleanDatabase() {
  try {
    await testDb.execute(sql`SET session_replication_role = replica`)

    const tables = [
      'habit_check_products',
      'habit_checks',
      'habit_periods',
      'habit_products',
      'habit_reminders',
      'habit_schedules',
      'habit_timings',
      'habits',
      'ingredient_edits',
      'ingredient_tags',
      'ingredients',
      'product_edits',
      'product_ingredients',
      'product_stock',
      'product_tags',
      'products',
      'profiles',
      'refresh_tokens',
      'tags',
      'user_bans',
      'users',
      'wellbeing_logs',
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
