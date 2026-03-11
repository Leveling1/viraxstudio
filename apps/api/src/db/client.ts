import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from '@viraxstudio/shared/db/schema'
import { env } from '../config/env.js'

export const sql = postgres(env.DATABASE_URL, {
  max: 10,
  prepare: false,
})

export const db = drizzle(sql, { schema })
