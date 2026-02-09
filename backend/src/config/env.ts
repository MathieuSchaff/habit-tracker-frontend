import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  JWT_SECRET: z.string().min(32),
  REFRESH_SECRET: z.string().min(32),
  DATABASE_URL: z.string(),
  POSTGRES_PASSWORD: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

export const env = envSchema.parse(Bun.env)
