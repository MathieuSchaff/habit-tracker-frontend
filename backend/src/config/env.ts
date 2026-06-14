import { z } from 'zod'

// dev_password_123 was committed to public git history; reject it in prod too.
const WEAK_DB_PASSWORDS = [
  'CHANGE_ME_IMMEDIATELY',
  'devpassword',
  'testpassword',
  'dev_password_123',
] as const

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    JWT_SECRET: z.string().min(32),
    REFRESH_SECRET: z.string().min(32),
    DATABASE_URL: z.string(),
    APP_DATABASE_URL: z.string(),
    POSTGRES_PASSWORD: z.string().optional(),
    BREVO_API_KEY: z.string(),
    MAIL_FROM_EMAIL: z.email(),
    MAIL_FROM_NAME: z.string().min(1).default('Aurore'),
    FRONTEND_URL: z.url(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    GOOGLE_REDIRECT_URI: z.url(),
    BUNNY_STORAGE_ZONE: z.string(),
    BUNNY_STORAGE_HOSTNAME: z.string().default('storage.bunnycdn.com'),
    BUNNY_STORAGE_PASSWORD: z.string(),
    IMAGE_CDN_BASE: z.url(),
    // Prod catalogue owner — consumed only by the db-prod-admin seeder, optional
    // elsewhere. Compose injects "" when unset, so coerce empty → undefined
    // before validating, else dev/test boot fails the email/min checks.
    ADMIN_EMAIL: z.preprocess((v) => v || undefined, z.email().optional()),
    ADMIN_PASSWORD: z.preprocess((v) => v || undefined, z.string().min(12).optional()),
  })
  .superRefine((val, ctx) => {
    if (val.NODE_ENV !== 'production') return
    for (const field of ['DATABASE_URL', 'APP_DATABASE_URL'] as const) {
      const url = val[field]
      const leaked = WEAK_DB_PASSWORDS.find((pw) => url.includes(pw))
      if (leaked) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: `${field} contains the default password "${leaked}". Rotate the Postgres role password and update the env var before booting in production.`,
        })
      }
    }
  })

export const env = envSchema.parse(Bun.env)
