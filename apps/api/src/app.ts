import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import sensible from '@fastify/sensible'
import { env } from './config/env.js'
import { ensureDefaultRecords } from './services/integrations.js'
import { ensureDefaultProfile } from './services/runs.js'
import { healthRoutes } from './routes/health.js'
import { authRoutes } from './routes/auth.js'
import { integrationRoutes } from './routes/integrations.js'
import { pipelineProfileRoutes } from './routes/pipeline-profiles.js'
import { runRoutes } from './routes/runs.js'
import { reviewRoutes } from './routes/reviews.js'
import { publicationRoutes } from './routes/publications.js'

export async function buildApp() {
  const app = Fastify({ logger: true })
  await app.register(sensible)
  await app.register(cookie, { secret: env.COOKIE_SECRET })
  await app.register(cors, {
    origin: env.WEB_APP_URL,
    credentials: true,
  })
  await app.register(helmet)

  await ensureDefaultRecords()
  await ensureDefaultProfile()

  await app.register(healthRoutes)
  await app.register(authRoutes)
  await app.register(integrationRoutes)
  await app.register(pipelineProfileRoutes)
  await app.register(runRoutes)
  await app.register(reviewRoutes)
  await app.register(publicationRoutes)

  return app
}
