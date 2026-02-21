import type { Config } from 'drizzle-kit'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined')
}
export default {
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // url: process.env.DATABASE_URL,
    url: databaseUrl,
  },
} satisfies Config
