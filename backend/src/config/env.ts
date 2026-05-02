import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  JWT_SECRET: z.string().min(32),
  REFRESH_SECRET: z.string().min(32),
  DATABASE_URL: z.string(),
  APP_DATABASE_URL: z.string(),
  POSTGRES_PASSWORD: z.string().optional(),
  BREVO_API_KEY: z.string(),
  FRONTEND_URL: z.url(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_REDIRECT_URI: z.url(),
  BUNNY_STORAGE_ZONE: z.string(),
  BUNNY_STORAGE_HOSTNAME: z.string().default('storage.bunnycdn.com'),
  BUNNY_STORAGE_PASSWORD: z.string(),
  IMAGE_CDN_BASE: z.url(),
})

export type Env = z.infer<typeof envSchema>

export const env = envSchema.parse(Bun.env)
