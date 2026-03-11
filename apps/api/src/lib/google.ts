import { OAuth2Client } from 'google-auth-library'
import { env } from '../config/env.js'

const scopes = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.upload',
]

export function createGoogleClient() {
  return new OAuth2Client(env.GOOGLE_OAUTH_CLIENT_ID, env.GOOGLE_OAUTH_CLIENT_SECRET, env.GOOGLE_OAUTH_REDIRECT_URI)
}

export function buildGoogleAuthUrl(state: string) {
  const client = createGoogleClient()
  return client.generateAuthUrl({
    access_type: 'offline',
    include_granted_scopes: true,
    prompt: 'consent',
    scope: scopes,
    state,
  })
}

export async function exchangeGoogleCode(code: string) {
  const client = createGoogleClient()
  const { tokens } = await client.getToken(code)
  client.setCredentials(tokens)

  if (!tokens.access_token) {
    throw new Error('Google OAuth did not return an access token')
  }

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  if (!profileRes.ok) {
    throw new Error('Unable to fetch Google profile')
  }
  const profile = await profileRes.json() as { email?: string; sub?: string; name?: string }

  const channelRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  if (!channelRes.ok) {
    throw new Error('Unable to fetch YouTube channel')
  }
  const channelPayload = await channelRes.json() as { items?: Array<{ id: string; snippet: { title: string; description?: string; thumbnails?: { default?: { url?: string } } } }> }
  const channel = channelPayload.items?.[0] ?? null

  return {
    tokens,
    profile,
    channel,
  }
}

export async function getAccessTokenFromRefreshToken(refreshToken: string) {
  const client = createGoogleClient()
  client.setCredentials({ refresh_token: refreshToken })
  const accessToken = await client.getAccessToken()
  if (!accessToken.token) {
    throw new Error('Unable to refresh Google access token')
  }
  return accessToken.token
}
