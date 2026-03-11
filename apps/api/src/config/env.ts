import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().default(3001),
  WEB_APP_URL: z.string().url(),
  API_PUBLIC_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  OWNER_GOOGLE_EMAIL: z.string().email().optional(),
  COOKIE_SECRET: z.string().min(32),
  APP_ENCRYPTION_KEY: z.string().min(10),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(168),
  GOOGLE_OAUTH_CLIENT_ID: z.string().min(1),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url(),
  S3_PUBLIC_BASE_URL: z.string().url().optional(),
})

export const env = envSchema.parse(process.env)