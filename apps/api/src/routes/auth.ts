import type { FastifyPluginAsync } from 'fastify'
import { loginRedirectSchema, ownerSessionSchema } from '@viraxstudio/shared/contracts'
import { buildGoogleAuthUrl, exchangeGoogleCode } from '../lib/google.js'
import { clearOauthStateCookie, clearSessionCookie, readOauthState, setOauthStateCookie, setSessionCookie } from '../lib/session.js'
import { env } from '../config/env.js'
import { createOwnerSession, deleteSessionFromRequest, getAuthSessionResponse } from '../services/auth.js'
import { upsertYoutubeConnection } from '../services/integrations.js'

export const authRoutes: FastifyPluginAsync = async fastify => {
  fastify.get('/api/v1/auth/session', async request => ownerSessionSchema.parse(await getAuthSessionResponse(request)))

  fastify.get('/api/v1/auth/google/start', async (_request, reply) => {
    const state = crypto.randomUUID()
    const url = buildGoogleAuthUrl(state)
    setOauthStateCookie(reply, state)
    return loginRedirectSchema.parse({ url })
  })

  fastify.get('/api/v1/auth/google/callback', async (request, reply) => {
    const query = request.query as { code?: string; state?: string }
    const expectedState = readOauthState(request)
    if (!query.code || !query.state || !expectedState || query.state !== expectedState) {
      clearOauthStateCookie(reply)
      return reply.redirect(`${env.WEB_APP_URL}/settings?auth=error`)
    }

    try {
      const result = await exchangeGoogleCode(query.code)
      if (!result.profile.email || !result.profile.sub) {
        throw new Error('Google profile is incomplete')
      }
      if (result.profile.email.toLowerCase() !== env.OWNER_GOOGLE_EMAIL.toLowerCase()) {
        throw new Error('Unauthorized owner email')
      }
      if (!result.channel) {
        throw new Error('No YouTube channel found for this Google account')
      }
      const refreshToken = result.tokens.refresh_token
      if (!refreshToken) {
        throw new Error('Google did not return a refresh token. Re-consent is required.')
      }

      await upsertYoutubeConnection({
        refreshToken,
        channelId: result.channel.id,
        channelTitle: result.channel.snippet.title,
        channelDescription: result.channel.snippet.description ?? null,
        channelThumbnailUrl: result.channel.snippet.thumbnails?.default?.url ?? null,
        ownerEmail: result.profile.email,
        ownerSubject: result.profile.sub,
      })

      const { token } = await createOwnerSession(result.profile.email, result.profile.sub)
      setSessionCookie(reply, token, env.SESSION_TTL_HOURS)
      clearOauthStateCookie(reply)
      return reply.redirect(`${env.WEB_APP_URL}/channel?auth=success`)
    } catch {
      clearOauthStateCookie(reply)
      clearSessionCookie(reply)
      return reply.redirect(`${env.WEB_APP_URL}/settings?auth=error`)
    }
  })

  fastify.post('/api/v1/auth/logout', async (request, reply) => {
    await deleteSessionFromRequest(request)
    clearSessionCookie(reply)
    return { ok: true }
  })
}
