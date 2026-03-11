import { and, eq } from 'drizzle-orm'
import { ownerSessions } from '@viraxstudio/shared/db/schema'
import { sha256 } from '@viraxstudio/shared/server/encryption'
import { db } from '../db/client.js'
import { env } from '../config/env.js'
import { addHours, toIso } from '../lib/time.js'
import { createSessionToken, readSessionToken } from '../lib/session.js'
import type { FastifyRequest } from 'fastify'

export async function createOwnerSession(ownerEmail: string, googleSubject: string) {
  const token = createSessionToken()
  const expiresAt = addHours(new Date(), env.SESSION_TTL_HOURS)
  const [session] = await db.insert(ownerSessions).values({
    ownerEmail,
    googleSubject,
    sessionTokenHash: sha256(token),
    expiresAt,
  }).returning()
  return { token, session }
}

export async function getOwnerSessionFromRequest(request: FastifyRequest) {
  const token = readSessionToken(request)
  if (!token) return null
  const tokenHash = sha256(token)
  const session = await db.query.ownerSessions.findFirst({
    where: (table, { eq, gt, and }) => and(eq(table.sessionTokenHash, tokenHash), gt(table.expiresAt, new Date())),
  })
  return session ?? null
}

export async function deleteSessionFromRequest(request: FastifyRequest) {
  const token = readSessionToken(request)
  if (!token) return
  const tokenHash = sha256(token)
  await db.delete(ownerSessions).where(eq(ownerSessions.sessionTokenHash, tokenHash))
}

export async function getAuthSessionResponse(request: FastifyRequest) {
  const session = await getOwnerSessionFromRequest(request)
  if (!session) {
    return {
      authenticated: false,
      ownerEmail: null,
      youtubeConnected: false,
      channelTitle: null,
      expiresAt: null,
    }
  }

  const youtube = await db.query.integrations.findFirst({ where: (table, { eq }) => eq(table.provider, 'youtube') })
  const channel = youtube
    ? await db.query.youtubeChannels.findFirst({ where: (table, { eq }) => eq(table.integrationId, youtube.id) })
    : null

  return {
    authenticated: true,
    ownerEmail: session.ownerEmail,
    youtubeConnected: !!channel,
    channelTitle: channel?.title ?? null,
    expiresAt: toIso(session.expiresAt),
  }
}
