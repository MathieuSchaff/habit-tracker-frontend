import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { PgTransaction } from 'drizzle-orm/pg-core'
import { Pool } from 'pg'

import * as schema from './schema'

export type Database = NodePgDatabase<typeof schema> & {
  $client: Pool
}

// Type pour les fonctions qui acceptent db OU tx
export type DB = Database | PgTransaction<any, typeof schema, any>

// export type Transaction = PgTransaction
//   NodePgQueryResultHKT,
//   typeof schema,
//   ExtractTablesWithRelations<typeof schema>
// >

// // Type union pour les deux cas
// export type DB = Database | Transaction
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export const db = drizzle(pool, { schema }) as Database
