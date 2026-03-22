import { SQL } from 'bun'

import { drizzle } from 'drizzle-orm/bun-sql'

import * as schema from '../db/schema'

const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST || 'postgres://app:testpassword@localhost:5433/appdb_test'

// Utilisation du client Bun natif
const client = new SQL(TEST_DATABASE_URL)

export const testDb = drizzle(client, { schema })

export async function closeTestDb() {
  // Bun SQL ne nécessite pas de fermeture manuelle complexe,
  // mais on peut fermer le client si nécessaire
  // client.close()
}

export type DB = typeof testDb
