import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'

import * as schema from '../db/schema' // ← Importer tout le schema

const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST || 'postgres://app:testpassword@localhost:5433/appdb_test'

const pool = new pg.Pool({
  connectionString: TEST_DATABASE_URL,
  max: 1,
})

// ← Passer le schema à drizzle
export const testDb = drizzle(pool, { schema })

export async function closeTestDb() {
  console.log('dans db')
  await pool.end()
}

export type DB = typeof testDb
