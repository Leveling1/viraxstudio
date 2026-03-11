import type { FastifyPluginAsync } from 'fastify'
import { loginRedirectSchema, ownerSessionSchema } from '@viraxstudio/shared/contracts'
import { buildGoogleAuthUrl, exchangeGoogleCode } from '../lib/google.js'
import { clearOauthStateCookie, clearSessionCookie, readOauthState, setOauthStateCookie, setSessionCookie } from '../lib/session.js'
import { env } from '../config/env.js'
import { createOwnerSession, deleteSessionFromRequest, getAuthSessionResponse } from '../services/auth.js'
import { getAuthorizedOwnerEmail, upsertYoutubeConnection } from '../services/integrations.js'

function buildWebRedirect(path: string, params?: Record<string, string>) {
  const url = new URL(path, env.WEB_APP_URL)
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
  }
  return url.toString()
}

function mapAuthErrorReason(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('Unauthorized owner email')) return 'owner_email_mismatch'
  if (message.includes('No YouTube channel found')) return 'youtube_channel_missing'
  if (message.includes('refresh token')) return 'refresh_token_missing'
  if (message.includes('Google profile is incomplete')) return 'google_profile_incomplete'
  return 'oauth_failed'
}

export const authRoutes: FastifyPluginAsync = async fastify => {
  fastify.get('/api/v1/auth/session', async request => ownerSessionSchema.parse(await getAuthSessionResponse(request)))

  fastify.get('/api/v1/auth/google/start', async (request, reply) => {
    const query = request.query as { mode?: string }
    const state = crypto.randomUUID()
    const url = buildGoogleAuthUrl(state)
    setOauthStateCookie(reply, state)

    if (query.mode === 'redirect') {
      return reply.redirect(url)
    }

    return loginRedirectSchema.parse({ url })
  })

  fastify.get('/api/v1/auth/google/callback', async (request, reply) => {
    const query = request.query as { code?: string; state?: string }
    const expectedState = readOauthState(request)
    if (!query.code || !query.state || !expectedState || query.state !== expectedState) {
      clearOauthStateCookie(reply)
      return reply.redirect(buildWebRedirect('/channel', { auth: 'error', reason: 'state_mismatch' }))
    }

    try {
      const result = await exchangeGoogleCode(query.code)
      if (!result.profile.email || !result.profile.sub) {
        throw new Error('Google profile is incomplete')
      }

      const allowedOwnerEmail = await getAuthorizedOwnerEmail()
      if (allowedOwnerEmail && result.profile.email.toLowerCase() !== allowedOwnerEmail) {
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
      return reply.redirect(buildWebRedirect('/channel', { auth: 'success' }))
    } catch (error) {
      request.log.error({ err: error }, 'Google OAuth callback failed')
      clearOauthStateCookie(reply)
      clearSessionCookie(reply)
      return reply.redirect(buildWebRedirect('/channel', { auth: 'error', reason: mapAuthErrorReason(error) }))
    }
  })

  fastify.post('/api/v1/auth/logout', async (request, reply) => {
    await deleteSessionFromRequest(request)
    clearSessionCookie(reply)
    return { ok: true }
  })
}