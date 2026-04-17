import { SQL } from 'bun'

import type { ExtractTablesWithRelations } from 'drizzle-orm'
import { type BunSQLDatabase, drizzle } from 'drizzle-orm/bun-sql'
import type { PgTransaction } from 'drizzle-orm/pg-core'

import { env } from '../config/env'
import * as schema from './schema'

export const client = new SQL(env.APP_DATABASE_URL)

export type Database = BunSQLDatabase<typeof schema> & { $client: SQL }

export type Transaction = PgTransaction<
  //biome-ignore lint/suspicious/noExplicitAny: BunSQLQueryResultHKT not yet exported
  any,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>

// Accepts both the main db instance and a transaction — use this in services
export type DB = BunSQLDatabase<typeof schema> | Transaction

export const db = drizzle(client, { schema }) as Database
