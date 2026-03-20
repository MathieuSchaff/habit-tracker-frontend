import { SQL } from 'bun'

import type { ExtractTablesWithRelations } from 'drizzle-orm'
import { type BunSQLDatabase, drizzle } from 'drizzle-orm/bun-sql'
import type { PgTransaction } from 'drizzle-orm/pg-core'

import * as schema from './schema'

export const client = new SQL(process.env.DATABASE_URL!)

// 1. Le type précis de l'objet 'db' principal (avec le client Bun)
export type Database = BunSQLDatabase<typeof schema> & { $client: SQL }

// 2. Le type générique pour une transaction Bun
export type Transaction = PgTransaction<
  any, // On peut mettre BunSQLQueryResultHKT ici pour être très précis
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>

// 3. LE TYPE À UTILISER DANS TES SERVICES
// Il dit : "J'accepte n'importe quoi qui peut faire des requêtes Drizzle sur mon schéma"
export type DB = BunSQLDatabase<typeof schema> | Transaction

export const db = drizzle(client, { schema }) as Database
