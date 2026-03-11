import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  APP_ENCRYPTION_KEY: z.string().min(10),
  GOOGLE_OAUTH_CLIENT_ID: z.string().min(1),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url(),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-20250514'),
  DEFAULT_ELEVENLABS_VOICE_ID: z.string().default('AZnzlk1XvdvUeBnXmlld'),
  DEFAULT_VIDEO_WIDTH: z.coerce.number().int().positive().default(1080),
  DEFAULT_VIDEO_HEIGHT: z.coerce.number().int().positive().default(1920),
  DEFAULT_VIDEO_FPS: z.coerce.number().int().positive().default(30),
  FFMPEG_PATH: z.string().default('ffmpeg'),
  S3_ENDPOINT: z.string().url(),
  S3_BUCKET: z.string().min(1),
  S3_REGION: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_PUBLIC_BASE_URL: z.string().url(),
  PEXELS_API_KEY: z.string().optional(),
  SCHEDULER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(60000),
})

export const env = envSchema.parse(process.env)
