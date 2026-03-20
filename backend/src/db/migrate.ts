import { SQL } from 'bun'

import { drizzle } from 'drizzle-orm/bun-sql'
import { migrate } from 'drizzle-orm/bun-sql/migrator'

const client = new SQL(process.env.DATABASE_URL!)
const db = drizzle(client)

async function main() {
  console.log('🚀 Running migrations with Bun.sql...')
  await migrate(db, { migrationsFolder: './drizzle' })
  console.log('✅ Migrations completed!')
}

main().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
