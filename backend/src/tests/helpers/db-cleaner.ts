import { sql } from 'drizzle-orm'

import { testDb } from '../db.test.config'

export async function cleanDatabase() {
  const tables = [
    'email_verifications',
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
    'product_tags',
    'products',
    'profiles',
    'refresh_tokens',
    'stock_entries',
    'subtasks',
    'tags',
    'tasks',
    'user_bans',
    'user_preferences',
    'user_product_reviews',
    'user_products',
    'users',
    'wellbeing_logs',
  ]
  try {
    // Désactive les contraintes de clés étrangères pour aller vite
    await testDb.execute(sql`SET session_replication_role = replica`)

    // On joint toutes les tables pour faire UN SEUL appel SQL
    const query = `TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE`
    await testDb.execute(sql.raw(query))
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage de la DB:', error)
    throw error
  } finally {
    // Quoi qu'il arrive (succès ou erreur), on remet le rôle par défaut
    await testDb.execute(sql`SET session_replication_role = DEFAULT`)
  }
}
