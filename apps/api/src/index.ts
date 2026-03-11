import { buildApp } from './app.js'
import { env } from './config/env.js'

const app = await buildApp()
const port = Number(process.env.PORT ?? env.API_PORT)

await app.listen({
  port,
  host: '0.0.0.0',
})