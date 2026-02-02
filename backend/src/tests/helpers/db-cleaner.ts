import { sql } from 'drizzle-orm'

import { testDb } from '../db.test.config'
/**
 * Vide toutes les tables de la DB de test
 * À appeler avant/après chaque test pour garantir l'isolation
 */
export async function cleanDatabase() {
  try {
    // Désactive temporairement les contraintes de clés étrangères
    await testDb.execute(sql`SET session_replication_role = replica;`)

    // Liste des tables dans l'ordre inverse des dépendances
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

    // Vide chaque table
    for (const table of tables) {
      await testDb.execute(sql.raw(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;`))
    }

    // Réactive les contraintes
    await testDb.execute(sql`SET session_replication_role = DEFAULT;`)
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage de la DB:', error)
    // Réactive les contraintes même en cas d'erreur
    await testDb.execute(sql`SET session_replication_role = DEFAULT;`)
    throw error
  }
}
